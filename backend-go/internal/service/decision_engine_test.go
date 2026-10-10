package service

import (
	"testing"

	"github.com/sirujuk/backend-go/domain"
)

func TestCategoryComesFromMLNotFromBackendCutoffs(t *testing.T) {
	e := DecisionEngine{YellowFrom: 50, RedFrom: 80} // would say green for score 14
	if got := e.Decide("r", domain.MLScores{Score: 14, Category: CategoryRed}); got.Decision != CategoryRed || !got.RequiresHumanReview {
		t.Fatalf("ML category must win: %+v", got)
	}
}

func TestFallbackCutoffsApplyOnlyWithoutMLCategory(t *testing.T) {
	e := DecisionEngine{YellowFrom: 50, RedFrom: 80}
	for score, want := range map[float64]string{10: CategoryGreen, 60: CategoryYellow, 90: CategoryRed} {
		if got := e.Decide("r", domain.MLScores{Score: score}).Decision; got != want {
			t.Errorf("score %v: want %s, got %s", score, want, got)
		}
	}
}

func reasons(codes ...string) []domain.Reason {
	out := make([]domain.Reason, len(codes))
	for i, c := range codes {
		out[i] = domain.Reason{Code: c, Contribution: 1}
	}
	return out
}

func TestRedNeedsEnoughIndependentLayersWhenConfigured(t *testing.T) {
	e := DecisionEngine{MinRedLayers: 2}
	one := e.Decide("r", domain.MLScores{Category: CategoryRed, Reasons: reasons("FACILITY_AVAILABLE_PER_SISRUTE", "INSUFFICIENT_HISTORY")})
	if one.Decision != CategoryYellow || one.ModelCategory != CategoryRed || !one.RequiresHumanReview {
		t.Fatalf("a single layer must not hold a claim, and the model's category must be kept: %+v", one)
	}
	two := e.Decide("r", domain.MLScores{Category: CategoryRed, Reasons: reasons("NS_ABOVE_PEER_P95", "NARRATIVE_GENERIC")})
	if two.Decision != CategoryRed {
		t.Fatalf("two layers keep red: %+v", two)
	}
	if got := (DecisionEngine{}).Decide("r", domain.MLScores{Category: CategoryRed, Reasons: reasons("NARRATIVE_GENERIC")}); got.Decision != CategoryRed {
		t.Fatal("default trusts the model")
	}
}
