package domain

import (
	"strings"
	"testing"
)

func TestRiskConfigBoundariesAndDefaults(t *testing.T) {
	c := DefaultRiskConfig()
	if err := c.Validate(); err != nil {
		t.Fatalf("the default must be valid: %v", err)
	}
	for score, want := range map[float64]string{0: "green", 49.9: "green", 50: "yellow", 79.9: "yellow", 80: "red", 100: "red"} {
		if got := c.CategoryOf(score); got != want {
			t.Errorf("score %v: got %s, want %s (green 0-49, yellow 50-79, red 80-100)", score, got, want)
		}
	}
}

func TestRiskConfigRefusesCutoffsThatBreakACategory(t *testing.T) {
	ok := DefaultRiskConfig()
	long := DefaultRiskConfig()
	long.Actions["red"] = CategoryAction{Recommendation: strings.Repeat("a", 201)}
	empty := DefaultRiskConfig()
	empty.Actions["green"] = CategoryAction{}
	missing := DefaultRiskConfig()
	delete(missing.Actions, "yellow")
	for name, c := range map[string]RiskConfig{
		"yellow equals red":   {YellowFrom: 60, RedFrom: 60, Actions: ok.Actions},
		"band under 5":        {YellowFrom: 76, RedFrom: 80, Actions: ok.Actions},
		"yellow below 1":      {YellowFrom: 0, RedFrom: 80, Actions: ok.Actions},
		"red above 100":       {YellowFrom: 50, RedFrom: 101, Actions: ok.Actions},
		"yellow above red":    {YellowFrom: 90, RedFrom: 80, Actions: ok.Actions},
		"recommendation long": long, "recommendation empty": empty, "action missing": missing,
	} {
		if c.Validate() == nil {
			t.Errorf("%s must be refused", name)
		}
	}
}
