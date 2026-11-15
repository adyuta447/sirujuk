package seed

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

func TestWaitForMLReturnsOnceTheServiceAnswers(t *testing.T) {
	calls := 0
	coldThenUp := func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error) {
		if calls++; calls < 3 {
			return domain.RiskDecision{}, errors.New("deadline exceeded")
		}
		return domain.RiskDecision{}, nil
	}
	if !WaitForML(coldThenUp, 10*time.Second) || calls != 3 {
		t.Fatalf("want success on the 3rd call, got %d calls", calls)
	}
	down := func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error) {
		return domain.RiskDecision{}, errors.New("down")
	}
	if WaitForML(down, 700*time.Millisecond) {
		t.Fatal("a service that never answers must report false after the timeout")
	}
	if !WaitForML(nil, time.Second) {
		t.Fatal("without an ML evaluator (dummy scoring) there is nothing to wait for")
	}
}
