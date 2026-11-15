package domain

import (
	"math"
	"strings"
	"testing"
)

func TestBreakdownSharesComeFromTheModelsOwnContributions(t *testing.T) {
	d := RiskDecision{Decision: "red", Score: 87, YellowFrom: 50, RedFrom: 80, ModelCategory: "red", Reasons: []Reason{
		{Code: "NS_ABOVE_PEER_P95", Contribution: 1.0},
		{Code: "HHI_HIGH_CONCENTRATION", Contribution: 3.0},
		{Code: "INSUFFICIENT_HISTORY", Contribution: 0}, // not a layer, never counted
		{Code: "NARRATIVE_GENERIC", Contribution: 1.0},
	}}
	b := d.Explain()
	if b.Dominant != "hhi" || len(b.Layers) != 3 || b.Layers[0].Layer != "hhi" || b.Layers[0].Share != 60 || b.Layers[1].Share != 20 {
		t.Fatalf("breakdown: %+v", b)
	}
	total := 0.0
	for _, l := range b.Layers {
		total += l.Share
	}
	if math.Abs(total-100) > 0.2 {
		t.Fatalf("shares must add up to about 100, got %v", total)
	}
	if !strings.HasPrefix(b.Summary, "Merah: skor 87 mencapai batas merah 80.") || !strings.Contains(b.Summary, "Konsentrasi rumah sakit tujuan (HHI) (60%)") {
		t.Fatalf("summary: %s", b.Summary)
	}
}

func TestBreakdownWithoutPositiveContributionAndPolicyDowngrade(t *testing.T) {
	green := RiskDecision{Decision: "green", Score: 12, YellowFrom: 50, RedFrom: 80, Reasons: []Reason{{Code: "INSUFFICIENT_HISTORY"}}}.Explain()
	if green.Dominant != "" || len(green.Layers) != 0 || green.Layers == nil || !strings.HasPrefix(green.Summary, "Hijau: skor 12 di bawah batas kuning 50.") {
		t.Fatalf("green: %+v", green)
	}
	down := RiskDecision{Decision: "yellow", ModelCategory: "red", Score: 85, YellowFrom: 50, RedFrom: 80}.Explain()
	if !strings.Contains(down.Summary, "Model menilai merah, tetapi kebijakan backend menurunkannya ke kuning") {
		t.Fatalf("a policy downgrade must be explained: %s", down.Summary)
	}
	if legacy := (RiskDecision{Decision: "yellow", Score: 30}).Explain(); !strings.HasPrefix(legacy.Summary, "Kategori yellow, skor 30.") {
		t.Fatalf("no cut-offs stored: %s", legacy.Summary)
	}
}

const mlBreakdownJSON = `{"max_category":"yellow","breakdown":{"intercept":-4.2,"logit":3.1,"dominant":"hhi","explanation":"Skor 100 (di atas 80) masuk kategori merah.",
 "items":[{"key":"ns","label":"NS: keluhan ringan","contribution":1.0,"share_pct":25.0},{"key":"hhi","label":"HHI: tujuan menumpuk","contribution":3.0,"share_pct":75.0},
 {"key":"comp","label":"Kompetensi RS tujuan","contribution":0.0,"share_pct":0.0}]}}`

func TestBreakdownTakesTheModelsOwnNumbersButWritesItsOwnCategorySentence(t *testing.T) {
	d := RiskDecision{Decision: "yellow", Score: 70, YellowFrom: 40, RedFrom: 75, Indicators: []byte(mlBreakdownJSON),
		Reasons: []Reason{{Code: "NS_ABOVE_PEER_P95", Contribution: 9}}} // reasons disagree on purpose: the model's breakdown wins
	b := d.Explain()
	if b.Source != "model" || b.Dominant != "hhi" || len(b.Layers) != 3 || b.Layers[0].Layer != "hhi" || b.Layers[0].Share != 75 || b.Layers[2].Share != 0 {
		t.Fatalf("model breakdown: %+v", b)
	}
	if b.Intercept == nil || *b.Intercept != -4.2 || b.Logit == nil || *b.Logit != 3.1 {
		t.Fatalf("intercept and logit must be passed on so intercept + contributions = logit can be checked: %+v", b)
	}
	if !strings.HasPrefix(b.Summary, "Kuning: skor 70 di antara batas kuning 40 dan merah 75.") || !strings.Contains(b.Summary, "Faktor terbesar: HHI (75%).") || strings.Contains(b.Summary, "di atas 80") {
		t.Fatalf("the sentence must use the cut-offs the backend applied, not the model's 50/80: %s", b.Summary)
	}
	if !strings.Contains(b.Summary, "Dibatasi sampai kuning") {
		t.Fatalf("a model ceiling must be explained: %s", b.Summary)
	}
}

func TestCompetenceMismatchIsALayerAndWithoutAModelBreakdownReasonsAreUsed(t *testing.T) {
	d := RiskDecision{Decision: "yellow", Score: 60, YellowFrom: 50, RedFrom: 80, Reasons: []Reason{{Code: "COMPETENCE_MISMATCH", Contribution: 2}, {Code: "NS_ABOVE_PEER_P95", Contribution: 2}}}
	b := d.Explain()
	if b.Source != "turunan" || len(b.Layers) != 2 || b.Layers[0].Share != 50 {
		t.Fatalf("derived: %+v", b)
	}
	found := false
	for _, l := range b.Layers {
		found = found || (l.Layer == "competence" && l.Label == "Kompetensi RS tujuan")
	}
	if !found || MaxCategory([]byte(`not json`)) != "" || MaxCategory(nil) != "" {
		t.Fatalf("competence layer missing or a bad indicators blob changed something: %+v", b)
	}
}
