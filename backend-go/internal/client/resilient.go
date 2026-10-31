package client

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

const (
	memQueueMax = 1000
	memDeadMax  = 100
	memHitsMax  = 5000 // keys the fallback limiter tracks at once
)

// Resilient is Redis with a per-instance memory fallback. When Redis is down, doctor features, idempotent replays, the
// retry queue and the login limiter keep working on this instance alone instead of silently switching off. The
// fallback is not shared between instances and is lost on restart; it is a safety net, not a replacement for Redis.
// /ready still reports redis as down, so the degraded state stays visible.
type Resilient struct {
	R Redis
	m *memory
}

// breakerPause is how long Redis is skipped after a failure. Without it every request would wait for Redis to fail
// again, and the scoring path has only 300 ms.
const breakerPause = 10 * time.Second

type hitCount struct {
	n     int64
	reset time.Time
}

type memory struct {
	mu        sync.Mutex
	downUntil time.Time // Redis is skipped until then
	kv        map[string][]byte
	hits      map[string]hitCount
	queue     []domain.ReferralRequest
	dead      []domain.ReferralRequest
}

func NewResilient(r Redis) Resilient {
	return Resilient{R: r, m: &memory{kv: map[string][]byte{}, hits: map[string]hitCount{}}}
}

// up reports whether Redis should be tried; down records a failure and pauses Redis for breakerPause.
func (r Resilient) up() bool {
	r.m.mu.Lock()
	defer r.m.mu.Unlock()
	return time.Now().After(r.m.downUntil)
}

func (r Resilient) down() {
	r.m.mu.Lock()
	r.m.downUntil = time.Now().Add(breakerPause)
	r.m.mu.Unlock()
}

// Get returns nil, nil on a miss. A Redis miss also checks memory, because a value may have been written while Redis was down.
func (r Resilient) Get(ctx context.Context, key string) ([]byte, error) {
	if r.up() {
		b, err := r.R.Get(ctx, key)
		if err != nil {
			r.down()
		} else if b != nil {
			return b, nil
		}
	}
	r.m.mu.Lock()
	defer r.m.mu.Unlock()
	return r.m.kv[key], nil
}

func (r Resilient) Set(ctx context.Context, key string, v []byte) error {
	if r.up() {
		if err := r.R.Set(ctx, key, v); err == nil {
			r.forget(key)
			return nil
		}
		r.down()
	}
	r.m.mu.Lock()
	defer r.m.mu.Unlock()
	r.m.kv[key] = v
	return nil
}

func (r Resilient) forget(key string) {
	r.m.mu.Lock()
	delete(r.m.kv, key)
	r.m.mu.Unlock()
}

func (r Resilient) Save(ctx context.Context, d domain.RiskDecision) error {
	b, _ := json.Marshal(d)
	return r.Set(ctx, "result:"+d.ReferralID, b)
}

func (r Resilient) Load(ctx context.Context, id string) (*domain.RiskDecision, error) {
	b, _ := r.Get(ctx, "result:"+id)
	if b == nil {
		return nil, nil
	}
	var d domain.RiskDecision
	return &d, json.Unmarshal(b, &d)
}

// Enqueue tries Redis and falls back to this instance's queue, so an accepted (202) referral is still scored later.
func (r Resilient) Enqueue(ctx context.Context, req domain.ReferralRequest, reason string) error {
	if r.up() {
		if err := r.R.Enqueue(ctx, req, reason); err == nil {
			return nil
		}
		r.down()
	}
	r.m.mu.Lock()
	defer r.m.mu.Unlock()
	if len(r.m.queue) >= memQueueMax {
		return context.DeadlineExceeded // full: the caller logs it, the referral itself already proceeded
	}
	r.m.queue = append(r.m.queue, req)
	return nil
}

// Hit counts per key inside a window. Redis shares it across instances; on failure it counts on this instance.
func (r Resilient) Hit(ctx context.Context, key string, window time.Duration) (int64, error) {
	if r.up() {
		if n, err := r.R.Hit(ctx, key, window); err == nil {
			return n, nil
		}
		r.down()
	}
	r.m.mu.Lock()
	defer r.m.mu.Unlock()
	h := r.m.hits[key]
	if time.Now().After(h.reset) {
		h = hitCount{reset: time.Now().Add(window)}
	}
	h.n++
	r.m.hits[key] = h
	r.m.trimHits(key)
	return h.n, nil
}

// trimHits keeps the counter map bounded without helping an attacker. Expired windows go first. If it is still too
// big, only keys with a single attempt are dropped, because a flood of unique emails produces exactly those, while an
// account under real guessing has several and keeps its count. (Wiping everything would let 5000 junk emails reset the
// limit for the account being attacked.) Must be called with m.mu held.
func (m *memory) trimHits(keep string) {
	if len(m.hits) <= memHitsMax {
		return
	}
	now := time.Now()
	for k, h := range m.hits {
		if k != keep && now.After(h.reset) {
			delete(m.hits, k)
		}
	}
	for k, h := range m.hits {
		if len(m.hits) <= memHitsMax {
			return
		}
		if k != keep && h.n <= 1 {
			delete(m.hits, k)
		}
	}
}

// Consume runs the Redis consumer and, alongside it, drains this instance's fallback queue.
func (r Resilient) Consume(ctx context.Context, name string, eval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error)) {
	go r.R.Consume(ctx, name, eval)
	for ctx.Err() == nil {
		sleep(ctx, 2*time.Second)
		for _, req := range r.takeQueued() {
			if !scoreWithRetry(ctx, req, eval, r.Save) {
				log.Printf(`{"event":"score_dlq_memory","referral_id":%q}`, req.ReferralID)
				r.m.mu.Lock()
				if len(r.m.dead) < memDeadMax {
					r.m.dead = append(r.m.dead, req)
				}
				r.m.mu.Unlock()
			}
		}
	}
}

func (r Resilient) takeQueued() []domain.ReferralRequest {
	r.m.mu.Lock()
	defer r.m.mu.Unlock()
	q := r.m.queue
	r.m.queue = nil
	return q
}

// Ping reports the real Redis state, not the fallback's.
func (r Resilient) Ping(ctx context.Context) error { return r.R.Ping(ctx) }

var (
	_ service.Cache = Resilient{}
	_ service.Queue = Resilient{}
	_ service.Store = Resilient{}
)
