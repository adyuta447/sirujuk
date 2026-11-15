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
	RandomAuditSalt     string
	// Config, when it has a value, sets the cut-offs nationally and replaces the ones the ML service reports. nil or
	// unset = the model's own category.
	Config ConfigSource
}

func (e DecisionEngine) randomAudit(referralID string) bool {
	if e.RandomAuditPermille <= 0 {
		return false
	}
	h := sha256.Sum256([]byte(e.RandomAuditSalt + "|" + referralID))
	return binary.BigEndian.Uint64(h[:8])%1000 < uint64(e.RandomAuditPermille)
}

func contributingLayers(reasons []domain.Reason) int {
	seen := map[string]bool{}
	for _, r := range reasons {
		if layer, ok := domain.LayerOf[r.Code]; ok && r.Contribution > 0 {
			seen[layer] = true
		}
	}
	return len(seen)
}

var categoryRank = map[string]int{CategoryGreen: 0, CategoryYellow: 1, CategoryRed: 2}

// capCategory keeps category at or below ceiling. An empty or unknown ceiling changes nothing.
func capCategory(category, ceiling string) string {
	if r, ok := categoryRank[ceiling]; ok && categoryRank[category] > r {
		return ceiling
	}
	return category
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
	yellowFrom, redFrom := signals.YellowFrom, signals.RedFrom
	if e.Config != nil {
		if cfg, ok := e.Config.Current(); ok {
			category, yellowFrom, redFrom = cfg.CategoryOf(signals.Score), cfg.YellowFrom, cfg.RedFrom
		}
	}
	if category == CategoryRed && e.MinRedLayers > 1 && contributingLayers(signals.Reasons) < e.MinRedLayers {
		category = CategoryYellow
	}
	category = capCategory(category, domain.MaxCategory(signals.Indicators)) // the model's ceiling outlives any national cut-offs
	random := category == CategoryGreen && e.randomAudit(referralID)
	codes := make([]string, len(signals.Reasons))
	for i, r := range signals.Reasons {
		codes[i] = r.Code
	}
	d := domain.RiskDecision{
		ReferralID: referralID, Score: signals.Score, Decision: category, Signals: signals,
		ModelVersion: signals.ModelVersion, ModelCategory: modelCategory, ReasonCodes: codes,
		YellowFrom: yellowFrom, RedFrom: redFrom, Indicators: signals.Indicators, DiagnosisVersion: signals.DiagnosisVersion, Reasons: signals.Reasons,
		RequiresHumanReview: category != CategoryGreen || random, RandomAudit: random, Status: "SCORED",
	}
	d.Breakdown = d.Explain()
	return d
}
