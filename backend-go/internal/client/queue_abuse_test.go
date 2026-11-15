package client

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirujuk/backend-go/domain"
)

// With a stream key set, only messages this backend sealed may be scored. A tampered sealed message, or a plaintext
// one written by anyone else with Redis access (a forged referral that would land in the store as if it were real),
// must go to the DLQ untouched and never reach scoring.
func TestQueueRefusesTamperedAndPlaintextMessagesWhenKeyed(t *testing.T) {
	r, mr := newTestRedis(t)
	r = r.WithKey([]byte("0123456789abcdef0123456789abcdef"))
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := r.Enqueue(ctx, domain.ReferralRequest{ReferralID: "R-tamper"}, "x"); err != nil {
		t.Fatal(err)
	}
	msgs, _ := mr.Stream(retryStream)
	sealed := []byte(msgs[0].Values[1]) // Values is [field, value, field, value]: referral_enc first
	sealed[len(sealed)-1] ^= 0xff
	mr.Del(retryStream)
	for _, values := range []map[string]any{{"referral_enc": string(sealed), "reason": "x"}, {"referral": `{"referral_id":"R-forged"}`, "reason": "x"}} {
		if err := r.C.XAdd(ctx, &redis.XAddArgs{Stream: retryStream, Values: values}).Err(); err != nil {
			t.Fatal(err)
		}
	}
	scored := make(chan string, 2)
	go r.Consume(ctx, "t", func(_ context.Context, q domain.ReferralRequest) (domain.RiskDecision, error) {
		scored <- q.ReferralID
		return domain.RiskDecision{ReferralID: q.ReferralID, Status: "SCORED"}, nil
	})
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		select {
		case id := <-scored:
			t.Fatalf("a message this backend did not seal was scored: %q", id)
		default:
		}
		if dead, _ := mr.Stream(dlqStream); len(dead) == 2 {
			if all := strings.Join(append(flatten(dead[0].Values), flatten(dead[1].Values)...), " "); !strings.Contains(all, "R-forged") {
				t.Fatalf("the DLQ must keep the raw payload for inspection: %s", all)
			}
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("refused messages never reached the DLQ")
}
