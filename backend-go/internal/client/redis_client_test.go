package client

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/sealbox"
)

func newTestRedis(t *testing.T) (Redis, *miniredis.Miniredis) {
	mr := miniredis.RunT(t)
	r, err := NewRedis("redis://" + mr.Addr())
	if err != nil {
		t.Fatal(err)
	}
	return r, mr
}

func TestConsumeScoresQueuedReferralAndStoresResult(t *testing.T) {
	r, _ := newTestRedis(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := r.Enqueue(ctx, domain.ReferralRequest{ReferralID: "R-9"}, "scoring_unavailable"); err != nil {
		t.Fatal(err)
	}
	go r.Consume(ctx, "t", func(_ context.Context, q domain.ReferralRequest) (domain.RiskDecision, error) {
		return domain.RiskDecision{ReferralID: q.ReferralID, Decision: "green", Status: "SCORED"}, nil
	})
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if d, _ := r.Load(ctx, "R-9"); d != nil {
			if d.Status != "SCORED" {
				t.Fatalf("bad result %+v", d)
			}
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("queued referral was never scored")
}

func TestConsumeMovesPersistentFailureToDLQ(t *testing.T) {
	r, mr := newTestRedis(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	_ = r.Enqueue(ctx, domain.ReferralRequest{ReferralID: "R-bad"}, "x")
	go r.Consume(ctx, "t", func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error) {
		return domain.RiskDecision{}, errors.New("ml down")
	})
	deadline := time.Now().Add(12 * time.Second) // 3 attempts, ~1s + ~2s backoff
	for time.Now().Before(deadline) {
		if n, _ := mr.Stream(dlqStream); len(n) == 1 {
			if !strings.Contains(strings.Join(flatten(n[0].Values), " "), "R-bad") {
				t.Fatal("the DLQ entry must keep the payload so it can be replayed")
			}
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("failed referral never reached the DLQ")
}

func TestQueuedReferralIsEncryptedAtRestAndStillScored(t *testing.T) {
	r, mr := newTestRedis(t)
	r = r.WithKey([]byte("0123456789abcdef0123456789abcdef"))
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	secret := "rahasia pasien: HIV reaktif"
	if err := r.Enqueue(ctx, domain.ReferralRequest{ReferralID: "R-enc", ClinicalNarrative: secret}, "x"); err != nil {
		t.Fatal(err)
	}
	msgs, _ := mr.Stream(retryStream)
	for _, m := range msgs {
		for _, v := range m.Values {
			if strings.Contains(v, secret) || strings.Contains(v, "R-enc") {
				t.Fatalf("plaintext leaked into the stream: %q", v)
			}
		}
	}
	got := make(chan string, 1)
	go r.Consume(ctx, "t", func(_ context.Context, q domain.ReferralRequest) (domain.RiskDecision, error) {
		got <- q.ClinicalNarrative
		return domain.RiskDecision{ReferralID: q.ReferralID, Status: "SCORED"}, nil
	})
	select {
	case n := <-got:
		if n != secret {
			t.Fatalf("consumer must decrypt back to the original, got %q", n)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("encrypted referral was never scored")
	}
}

func TestSealRejectsTamperingAndWrongKey(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef")
	sealed, _ := sealbox.Seal(key, []byte("data"))
	sealed[len(sealed)-1] ^= 1
	if _, err := sealbox.Open(key, sealed); err == nil {
		t.Fatal("a modified message must not open")
	}
	if _, err := sealbox.Seal([]byte("short"), []byte("x")); err == nil {
		t.Fatal("a key that is not 32 bytes must be refused")
	}
}

func flatten(kv []string) []string { return kv }
