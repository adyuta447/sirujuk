package service

import (
	"crypto/sha256"
	"encoding/binary"

	"github.com/sirujuk/backend-go/domain"
)

const (
	CategoryGreen  = "green"
	CategoryYellow = "yellow"
	CategoryRed    = "red"
)

func validCategory(c string) bool {
	return c == CategoryGreen || c == CategoryYellow || c == CategoryRed
}

type DecisionEngine struct {
	YellowFrom, RedFrom float64
	MinRedLayers        int
	RandomAuditPermille int
	RandomAuditSalt string
}

func (e DecisionEngine) randomAudit(referralID string) bool {
	if e.RandomAuditPermille <= 0 {
		return false
	}
	h := sha256.Sum256([]byte(e.RandomAuditSalt + "|" + referralID))
	return binary.BigEndian.Uint64(h[:8])%1000 < uint64(e.RandomAuditPermille)
}

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
	random := category == CategoryGreen && e.randomAudit(referralID)
	codes := make([]string, len(signals.Reasons))
	for i, r := range signals.Reasons {
		codes[i] = r.Code
	}
	return domain.RiskDecision{
		ReferralID: referralID, Score: signals.Score, Decision: category, Signals: signals,
		ModelVersion: signals.ModelVersion, ModelCategory: modelCategory, ReasonCodes: codes,
		YellowFrom: signals.YellowFrom, RedFrom: signals.RedFrom, Indicators: signals.Indicators, DiagnosisVersion: signals.DiagnosisVersion, Reasons: signals.Reasons,
		RequiresHumanReview: category != CategoryGreen || random, RandomAudit: random, Status: "SCORED",
	}
}
