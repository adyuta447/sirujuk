package service

import (
	"context"
	"errors"
	"testing"

	"github.com/sirujuk/backend-go/domain"
)

func TestConfiguredCutoffsReplaceTheModelsCategoryAndAreKeptWithTheDecision(t *testing.T) {
	signals := domain.MLScores{Score: 60, Category: "yellow", YellowFrom: 50, RedFrom: 80, ModelVersion: "m"}
	if d := (DecisionEngine{}).Decide("r-1", signals); d.Decision != "yellow" || d.YellowFrom != 50 || d.RedFrom != 80 {
		t.Fatalf("with no configuration the model decides: %+v", d)
	}
	live := &LiveConfig{}
	if d := (DecisionEngine{Config: live}).Decide("r-1", signals); d.Decision != "yellow" {
		t.Fatalf("a never-configured LiveConfig must not change anything: %+v", d)
	}
	cfg := domain.DefaultRiskConfig()
	cfg.YellowFrom, cfg.RedFrom = 70, 90
	live.Set(cfg)
	d := DecisionEngine{Config: live}.Decide("r-1", signals)
	if d.Decision != "green" || d.ModelCategory != "yellow" || d.YellowFrom != 70 || d.RedFrom != 90 {
		t.Fatalf("score 60 is green under 70/90, the model's own word stays in ModelCategory: %+v", d)
	}
	if d.Breakdown == nil || d.Breakdown.Summary == "" || d.Breakdown.Summary[:6] != "Hijau:" {
		t.Fatalf("the explanation must use the cut-offs that were applied: %+v", d.Breakdown)
	}
}

type failingConfigStore struct{ err error }

func (f failingConfigStore) Load(context.Context) (domain.RiskConfig, bool, error) {
	return domain.RiskConfig{}, false, f.err
}
func (f failingConfigStore) Save(context.Context, domain.RiskConfig) error { return f.err }

func TestAStoreOutageKeepsTheLastKnownCutoffs(t *testing.T) {
	live := &LiveConfig{}
	cfg := domain.DefaultRiskConfig()
	cfg.YellowFrom = 40
	live.Set(cfg)
	live.Refresh(context.Background(), failingConfigStore{errors.New("down")})
	if got, ok := live.Current(); !ok || got.YellowFrom != 40 {
		t.Fatalf("a failed refresh must not change categories: %+v %v", got, ok)
	}
}

func TestAModelCeilingSurvivesNationalCutoffs(t *testing.T) {
	live := &LiveConfig{}
	cfg := domain.DefaultRiskConfig()
	cfg.YellowFrom, cfg.RedFrom = 40, 60 // a strict national setting: 79.9 would be red
	live.Set(cfg)
	signals := domain.MLScores{Score: 79.9, Category: "yellow", YellowFrom: 50, RedFrom: 80, Indicators: []byte(`{"max_category":"yellow"}`)}
	d := DecisionEngine{Config: live}.Decide("r-1", signals)
	if d.Decision != "yellow" || d.YellowFrom != 40 || d.RedFrom != 60 {
		t.Fatalf("a competence-only mismatch must stay at most yellow whatever the cut-offs: %+v", d)
	}
	signals.Indicators = nil
	if d := (DecisionEngine{Config: live}).Decide("r-1", signals); d.Decision != "red" {
		t.Fatalf("without a ceiling the national cut-offs apply: %+v", d)
	}
	if capCategory("red", "") != "red" || capCategory("red", "bogus") != "red" || capCategory("green", "yellow") != "green" || capCategory("red", "green") != "green" {
		t.Fatal("capCategory: empty or unknown ceiling changes nothing; it only ever lowers")
	}
}

func TestCompetenceMismatchCountsAsAnIndependentLayerForMinRedLayers(t *testing.T) {
	e := DecisionEngine{MinRedLayers: 2}
	two := domain.MLScores{Score: 90, Category: "red", Reasons: []domain.Reason{{Code: "NS_ABOVE_PEER_P95", Contribution: 1}, {Code: "COMPETENCE_MISMATCH", Contribution: 1}}}
	one := domain.MLScores{Score: 90, Category: "red", Reasons: []domain.Reason{{Code: "NS_ABOVE_PEER_P95", Contribution: 1}}}
	if e.Decide("a", two).Decision != "red" || e.Decide("b", one).Decision != "yellow" {
		t.Fatal("red needs two independent layers, and the competence layer is one of them")
	}
}
