package domain

import (
	"errors"
	"unicode/utf8"
)

// Default cut-offs on the 0-100 score the ML service reports: green below 50, yellow 50-79, red from 80. They mirror
// DISPLAY_YELLOW and DISPLAY_RED in ml-service/app/ml/model.py (the model's own capacity-budget cuts, mapped to 50/80).
const (
	DefaultYellowFrom = 50.0
	DefaultRedFrom    = 80.0
	minBand           = 5.0 // yellow must be at least this far below red
	maxRecommendation = 200
)

// CategoryAction is what the system recommends, and whether it raises an alert, for one category.
type CategoryAction struct {
	Recommendation string `json:"recommendation"`
	Alert          bool   `json:"alert"`
}

// RiskConfig is the national setting for the risk categories. It applies to referrals scored after it changes; every
// decision keeps the cut-offs it was scored with (RiskDecision.YellowFrom/RedFrom), so an older one stays explainable.
type RiskConfig struct {
	YellowFrom float64                   `json:"yellow_from"`
	RedFrom    float64                   `json:"red_from"`
	Actions    map[string]CategoryAction `json:"actions"` // keys: green, yellow, red
	Version    int                       `json:"version"` // 0 = never configured
	UpdatedBy  string                    `json:"updated_by,omitempty"`
	UpdatedAt  string                    `json:"updated_at,omitempty"`
}

func DefaultRiskConfig() RiskConfig {
	return RiskConfig{YellowFrom: DefaultYellowFrom, RedFrom: DefaultRedFrom, Actions: map[string]CategoryAction{
		"green":  {Recommendation: "Rujukan dapat diproses seperti biasa.", Alert: false},
		"yellow": {Recommendation: "Verifikator memeriksa kewajaran rujukan sebelum klaim diproses.", Alert: true},
		"red":    {Recommendation: "Klaim ditahan sampai TKMKB memutuskan; minta klarifikasi dokter. Pelayanan pasien tidak ditunda.", Alert: true},
	}}
}

// CategoryOf is the category a score falls in under these cut-offs.
func (c RiskConfig) CategoryOf(score float64) string {
	switch {
	case score >= c.RedFrom:
		return "red"
	case score >= c.YellowFrom:
		return "yellow"
	}
	return "green"
}

// Validate refuses cut-offs that would make a category meaningless or hide every referral.
func (c RiskConfig) Validate() error {
	if !(c.YellowFrom >= 1 && c.RedFrom <= 100 && c.RedFrom-c.YellowFrom >= minBand) {
		return errors.New("need 1 <= yellow_from, red_from <= 100 and red_from - yellow_from >= 5")
	}
	if len(c.Actions) != 3 {
		return errors.New("actions must hold exactly green, yellow and red")
	}
	for _, k := range []string{"green", "yellow", "red"} {
		a, ok := c.Actions[k]
		if !ok || a.Recommendation == "" || utf8.RuneCountInString(a.Recommendation) > maxRecommendation {
			return errors.New("each action needs a recommendation of at most 200 characters")
		}
	}
	return nil
}
