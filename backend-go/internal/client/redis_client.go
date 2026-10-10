package client

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

// Redis is the cache for batch doctor features and the retry stream for async scoring.
type Redis struct {
	C *redis.Client
	// Key (32 bytes) encrypts queued referrals, which carry the clinical narrative and patient name. Nil = plaintext (dev only).
	Key []byte
}

// WithKey returns a copy that encrypts everything it queues.
func (r Redis) WithKey(key []byte) Redis { r.Key = key; return r }

// Ping reports whether Redis answers; used by /ready and at startup.
func (r Redis) Ping(ctx context.Context) error { return r.C.Ping(ctx).Err() }

func NewRedis(url string) (Redis, error) {
	opt, err := redis.ParseURL(url)
	if err != nil { // NewClient(nil) would panic
		return Redis{}, err
	}
	return Redis{C: redis.NewClient(opt)}, nil
}

// Hit counts one event under key and returns how many happened in the current window (the window starts at the
// first hit). Used for login throttling that must hold across Cloud Run instances.
func (r Redis) Hit(ctx context.Context, key string, window time.Duration) (int64, error) {
	n, err := r.C.Incr(ctx, key).Result()
	if err == nil && n == 1 {
		err = r.C.Expire(ctx, key, window).Err()
	}
	return n, err
}

// Get returns nil, nil on a miss.
func (r Redis) Get(ctx context.Context, key string) ([]byte, error) {
	b, err := r.C.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return b, err
}

func (r Redis) Set(ctx context.Context, key string, v []byte) error {
	return r.C.Set(ctx, key, v, 24*time.Hour).Err()
}

const (
	retryStream = "scoring:retry"
	dlqStream   = "scoring:dlq"
	group       = "scorers"
	resultTTL   = 7 * 24 * time.Hour
)

// Enqueue adds to the retry stream. shortcut: the narrative sits unencrypted in Redis (password-protected,
// internal network, capped length); encrypt it (narrative_enc) before real patient data.
func (r Redis) Enqueue(ctx context.Context, req domain.ReferralRequest, reason string) error {
	b, _ := json.Marshal(req)
	field := "referral"
	if r.Key != nil {
		sealed, err := seal(r.Key, b)
		if err != nil {
			return err
		}
		b, field = sealed, "referral_enc"
	}
	return r.C.XAdd(ctx, &redis.XAddArgs{Stream: retryStream, MaxLen: 100000, Approx: true, Values: map[string]any{field: b, "reason": reason}}).Err()
}

func (r Redis) Save(ctx context.Context, d domain.RiskDecision) error {
	b, _ := json.Marshal(d)
	return r.C.Set(ctx, "result:"+d.ReferralID, b, resultTTL).Err()
}

func (r Redis) Load(ctx context.Context, id string) (*domain.RiskDecision, error) {
	b, err := r.Get(ctx, "result:"+id)
	if err != nil || b == nil {
		return nil, err
	}
	var d domain.RiskDecision
	return &d, json.Unmarshal(b, &d)
}

// Consume scores queued referrals until ctx ends: up to 3 attempts with backoff+jitter, then the DLQ.
// shortcut: messages left pending by a crashed consumer are not reclaimed (XAUTOCLAIM) yet.
func (r Redis) Consume(ctx context.Context, name string, eval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error)) {
	if err := r.C.XGroupCreateMkStream(ctx, retryStream, group, "0").Err(); err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Printf("consumer disabled: %v", err)
		return
	}
	for ctx.Err() == nil {
		res, err := r.C.XReadGroup(ctx, &redis.XReadGroupArgs{Group: group, Consumer: name, Streams: []string{retryStream, ">"}, Count: 10, Block: 5 * time.Second}).Result()
		if err != nil {
			if !errors.Is(err, redis.Nil) && ctx.Err() == nil {
				time.Sleep(2 * time.Second)
			}
			continue
		}
		for _, m := range res[0].Messages {
			r.handle(ctx, m, eval)
		}
	}
}

func (r Redis) handle(ctx context.Context, m redis.XMessage, eval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error)) {
	var req domain.ReferralRequest
	raw, _ := m.Values["referral"].(string)
	if enc, ok := m.Values["referral_enc"].(string); ok && r.Key != nil {
		if plain, err := open(r.Key, []byte(enc)); err == nil {
			raw = string(plain)
		}
	}
	if json.Unmarshal([]byte(raw), &req) == nil {
		for attempt := 0; attempt < 3; attempt++ {
			if attempt > 0 {
				time.Sleep(time.Duration(1<<attempt)*time.Second + time.Duration(rand.Intn(500))*time.Millisecond)
			}
			actx, cancel := context.WithTimeout(ctx, 2*time.Second)
			d, err := eval(actx, req)
			cancel()
			if err == nil && r.Save(ctx, d) == nil {
				r.C.XAck(ctx, retryStream, group, m.ID)
				return
			}
		}
	}
	log.Printf(`{"event":"score_dlq","referral_id":%q,"msg_id":%q}`, req.ReferralID, m.ID)
	// Keep the payload for replay exactly as it was queued (encrypted when a key is set), never decrypted into the DLQ.
	dead := map[string]any{"error": "scoring failed"}
	for _, field := range []string{"referral", "referral_enc"} {
		if v, ok := m.Values[field]; ok {
			dead[field] = v
		}
	}
	r.C.XAdd(ctx, &redis.XAddArgs{Stream: dlqStream, Values: dead})
	r.C.XAck(ctx, retryStream, group, m.ID)
}

var (
	_ service.Cache = Redis{}
	_ service.Queue = Redis{}
	_ service.Store = Redis{}
)
