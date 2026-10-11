package client

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// deadRedis points at a closed port, so every call fails at once.
func deadRedis(t *testing.T) Resilient {
	t.Helper()
	r, err := NewRedis("redis://127.0.0.1:1/0")
	if err != nil {
		t.Fatal(err)
	}
	return NewResilient(r)
}

func TestFeaturesAndResultsSurviveRedisBeingDown(t *testing.T) {
	r := deadRedis(t)
	ctx := context.Background()
	if err := r.Set(ctx, "doctor:d1", []byte(`{"n90":40}`)); err != nil {
		t.Fatalf("Set must not fail when Redis is down: %v", err)
	}
	if b, _ := r.Get(ctx, "doctor:d1"); string(b) != `{"n90":40}` {
		t.Fatalf("feature written during the outage must be readable: %q", b)
	}
	if b, _ := r.Get(ctx, "doctor:none"); b != nil {
		t.Fatal("a miss is nil, not an error")
	}
	if err := r.Save(ctx, domain.RiskDecision{ReferralID: "R-1", Status: "SCORED", Decision: "red"}); err != nil {
		t.Fatal(err)
	}
	d, err := r.Load(ctx, "R-1")
	if err != nil || d == nil || d.Decision != "red" {
		t.Fatalf("a repeated request must still find the stored result: %+v %v", d, err)
	}
	if d, _ := r.Load(ctx, "R-unknown"); d != nil {
		t.Fatal("unknown id must be nil")
	}
}

func TestLoginLimiterStillCountsWithoutRedis(t *testing.T) {
	r := deadRedis(t)
	ctx := context.Background()
	for want := int64(1); want <= 3; want++ {
		if n, err := r.Hit(ctx, "login:x", time.Minute); err != nil || n != want {
			t.Fatalf("attempt %d: got %d err=%v", want, n, err)
		}
	}
	if n, _ := r.Hit(ctx, "login:other", time.Minute); n != 1 {
		t.Fatalf("keys are counted separately, got %d", n)
	}
	if n, _ := r.Hit(ctx, "login:y", time.Nanosecond); n != 1 {
		t.Fatal("first hit")
	}
	time.Sleep(2 * time.Millisecond)
	if n, _ := r.Hit(ctx, "login:y", time.Nanosecond); n != 1 {
		t.Fatalf("a new window must reset the count, got %d", n)
	}
}

func TestAcceptedReferralIsStillScoredWhenRedisIsDown(t *testing.T) {
	r := deadRedis(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := r.Enqueue(ctx, domain.ReferralRequest{ReferralID: "R-q"}, "scoring_unavailable"); err != nil {
		t.Fatalf("enqueue must fall back to memory: %v", err)
	}
	scored := make(chan string, 1)
	go r.Consume(ctx, "t", func(_ context.Context, q domain.ReferralRequest) (domain.RiskDecision, error) {
		scored <- q.ReferralID
		return domain.RiskDecision{ReferralID: q.ReferralID, Status: "SCORED"}, nil
	})
	select {
	case id := <-scored:
		if id != "R-q" {
			t.Fatalf("scored %q", id)
		}
	case <-time.After(6 * time.Second):
		t.Fatal("the fallback queue was never drained")
	}
}

func TestRedisValueWinsOnceItIsBackAndMemoryIsCleared(t *testing.T) {
	r, _ := newTestRedis(t)
	res := NewResilient(r)
	ctx := context.Background()
	res.m.kv["k"] = []byte("old, written during an outage")
	if err := res.Set(ctx, "k", []byte("new")); err != nil {
		t.Fatal(err)
	}
	if b, _ := res.Get(ctx, "k"); string(b) != "new" {
		t.Fatalf("Redis value must win: %q", b)
	}
	if _, stale := res.m.kv["k"]; stale {
		t.Fatal("the stale memory copy must be dropped once Redis took the write")
	}
}

func TestConsumerWaitsForRedisInsteadOfGivingUp(t *testing.T) {
	r := deadRedis(t)
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()
	done := make(chan struct{})
	go func() { r.R.Consume(ctx, "t", nil); close(done) }()
	select {
	case <-done: // returns only because ctx ended, after it kept waiting
	case <-time.After(3 * time.Second):
		t.Fatal("consumer must stop promptly when the context ends")
	}
}

func TestFloodOfJunkEmailsCannotResetTheCountOfAnAttackedAccount(t *testing.T) {
	r := deadRedis(t)
	ctx := context.Background()
	for i := 0; i < 8; i++ { // someone is guessing passwords for one account
		_, _ = r.Hit(ctx, "login:victim", time.Hour)
	}
	for i := 0; i < memHitsMax+2000; i++ { // while a flood of unique emails tries to flush the map
		_, _ = r.Hit(ctx, "login:junk"+strconv.Itoa(i), time.Hour)
	}
	if n, _ := r.Hit(ctx, "login:victim", time.Hour); n != 9 {
		t.Fatalf("the attacked account must keep its count (9th attempt), got %d", n)
	}
	r.m.mu.Lock()
	size := len(r.m.hits)
	r.m.mu.Unlock()
	if size > memHitsMax+1 {
		t.Fatalf("the map must stay bounded, got %d keys", size)
	}
}

func TestDownRedisIsSkippedSoRequestsStayFast(t *testing.T) {
	r := deadRedis(t)
	ctx := context.Background()
	_ = r.Set(ctx, "k", []byte("v")) // the first failure opens the breaker
	start := time.Now()
	for i := 0; i < 200; i++ {
		_, _ = r.Get(ctx, "k")
		_, _ = r.Hit(ctx, "login:x", time.Minute)
		_ = r.Enqueue(ctx, domain.ReferralRequest{ReferralID: "r"}, "x")
	}
	if took := time.Since(start); took > 300*time.Millisecond {
		t.Fatalf("600 calls took %v: a Redis that is known to be down must not be retried on every request", took)
	}
}
