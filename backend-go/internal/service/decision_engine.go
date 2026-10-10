package service

import "github.com/sirujuk/backend-go/domain"

// Categories are the wire values; the DB stores them upper-case.
const (
	CategoryGreen  = "green"
	CategoryYellow = "yellow"
	CategoryRed    = "red"
)

func validCategory(c string) bool {
	return c == CategoryGreen || c == CategoryYellow || c == CategoryRed
}

// DecisionEngine turns ML signals into a recommendation. The category comes from the ML model, whose p80/p95
// cut-offs are fitted to its own score distribution, so the backend keeps no cut-off for it (one source of truth).
// YellowFrom/RedFrom exist only for the dummy heuristic, which has no model and so no category.
// Output is a recommendation only; final decisions are written by TKMKB/verifier users.
type DecisionEngine struct {
	YellowFrom, RedFrom float64
	// MinRedLayers > 1 holds red back unless that many independent layers (NS, HHI, SISRUTE, narrative) contribute, so
	// one weak layer alone cannot hold a claim. A downgraded referral becomes yellow; the model's own category stays
	// in ModelCategory for appeals. 0 or 1 = trust the model. A team decision, see docs/proposal-gaps.md.
	MinRedLayers int
}

// layerOf maps a reason code to the scoring layer it belongs to; codes without a layer (e.g. INSUFFICIENT_HISTORY) are ignored.
var layerOf = map[string]string{
	"NS_ABOVE_PEER_P95":              "ns",
	"HHI_HIGH_CONCENTRATION":         "hhi",
	"FACILITY_AVAILABLE_PER_SISRUTE": "sisrute",
	"NARRATIVE_GENERIC":              "narrative",
}

func contributingLayers(reasons []domain.Reason) int {
	seen := map[string]bool{}
	for _, r := range reasons {
		if layer, ok := layerOf[r.Code]; ok && r.Contribution > 0 {
			seen[layer] = true
		}
	}
	return len(seen)
}

func (e DecisionEngine) category(signals domain.MLScores) string {
	switch {
	case signals.Category != "":
		return signals.Category
	case signals.Score >= e.RedFrom:
		return CategoryRed
	case signals.Score >= e.YellowFrom:
		return CategoryYellow
	}
	return CategoryGreen
}

func (e DecisionEngine) Decide(referralID string, signals domain.MLScores) domain.RiskDecision {
	modelCategory := e.category(signals)
	category := modelCategory
	if category == CategoryRed && e.MinRedLayers > 1 && contributingLayers(signals.Reasons) < e.MinRedLayers {
		category = CategoryYellow
	}
	codes := make([]string, len(signals.Reasons))
	for i, r := range signals.Reasons {
		codes[i] = r.Code
	}
	return domain.RiskDecision{
		ReferralID: referralID, Score: signals.Score, Decision: category, Signals: signals,
		ModelVersion: signals.ModelVersion, ModelCategory: modelCategory, ReasonCodes: codes,
		YellowFrom: signals.YellowFrom, RedFrom: signals.RedFrom, Indicators: signals.Indicators, DiagnosisVersion: signals.DiagnosisVersion, Reasons: signals.Reasons,
		RequiresHumanReview: category != CategoryGreen, Status: "SCORED",
	}
}
