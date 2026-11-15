package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

func configHandler(score float64) ReferralHandler {
	h, _ := crudHandler(fixedML{score: score})
	h.ConfigLive, h.ConfigStore = &service.LiveConfig{}, &repository.MemoryRiskConfig{}
	h.Decisions.Engine.YellowFrom, h.Decisions.Engine.RedFrom = 50, 80 // what the model uses when nothing is configured
	h.Decisions.Engine.Config = h.ConfigLive
	return h
}

func putRisk(h ReferralHandler, role, query, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("PUT", "/api/v1/config/risk"+query, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if role != "" {
		r.Header.Set("X-Actor", role+"@demo.id")
		r.Header.Set("X-Actor-Role", role)
	}
	w := httptest.NewRecorder()
	h.UpdateRiskConfig(w, r)
	return w
}

func TestRiskConfigIsReadableByStaffButNotDoctorsAndDefaultsToTheModel(t *testing.T) {
	h := configHandler(5)
	for _, role := range []string{"verifikator", "tkmkb", "dinkes"} {
		w := doAs(role, h.RiskConfig, "GET", "", "")
		var got riskConfigResponse
		if err := json.Unmarshal(w.Body.Bytes(), &got); w.Code != http.StatusOK || err != nil || got.Source != "model_default" || got.YellowFrom != 50 || got.RedFrom != 80 || got.ModelReference.RedFrom != 80 {
			t.Fatalf("%s: %d %s", role, w.Code, w.Body)
		}
	}
	if w := doAs("dokter", h.RiskConfig, "GET", "", ""); w.Code != http.StatusForbidden {
		t.Fatalf("a doctor must not read it, got %d", w.Code)
	}
	if w := (ReferralHandler{}); true {
		if rec := doAs("tkmkb", w.RiskConfig, "GET", "", ""); rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("unwired: want 503, got %d", rec.Code)
		}
	}
}

const riskBody = `{"yellow_from":%d,"red_from":%d,"version":%d}`

func TestOnlyTKMKBChangesTheCutoffsAndNewScoresFollowAtOnce(t *testing.T) {
	h := configHandler(60) // the model's score for everything: yellow under 50/80
	for _, role := range []string{"verifikator", "dinkes", "dokter", ""} {
		if w := putRisk(h, role, "", fmt.Sprintf(riskBody, 70, 90, 0)); w.Code != http.StatusForbidden {
			t.Errorf("%q must not change the cut-offs, got %d", role, w.Code)
		}
	}
	if d, _ := h.Decisions.Evaluate(t.Context(), domain.ReferralRequest{ReferralID: "x-1", DiagnosisCode: "I10"}); d.Decision != "yellow" {
		t.Fatalf("before the change 60 is yellow: %+v", d)
	}
	w := putRisk(h, "tkmkb", "", fmt.Sprintf(riskBody, 70, 90, 0))
	if w.Code != http.StatusOK {
		t.Fatalf("tkmkb: %d %s", w.Code, w.Body)
	}
	var got struct{ Config riskConfigResponse }
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if got.Config.Version != 1 || got.Config.UpdatedBy != "tkmkb@demo.id" || got.Config.UpdatedAt == "" || got.Config.Source != "configured" {
		t.Fatalf("saved config: %+v", got.Config)
	}
	d, _ := h.Decisions.Evaluate(t.Context(), domain.ReferralRequest{ReferralID: "x-2", DiagnosisCode: "I10"})
	if d.Decision != "green" || d.YellowFrom != 70 || d.RedFrom != 90 {
		t.Fatalf("a new score follows the new cut-offs and records them: %+v", d)
	}
	if rec := doAs("verifikator", h.RiskConfig, "GET", "", ""); !strings.Contains(rec.Body.String(), `"source":"configured"`) {
		t.Fatalf("reading it back: %s", rec.Body)
	}
}

func TestBadStaleOrUnknownConfigIsRefusedAndChangesNothing(t *testing.T) {
	h := configHandler(60)
	good := fmt.Sprintf(riskBody, 70, 90, 0)
	if w := putRisk(h, "tkmkb", "", good); w.Code != http.StatusOK {
		t.Fatalf("setup: %d", w.Code)
	}
	for name, body := range map[string]string{
		"yellow equals red": fmt.Sprintf(riskBody, 60, 60, 1), "band under 5": fmt.Sprintf(riskBody, 76, 80, 1), "red above 100": fmt.Sprintf(riskBody, 50, 101, 1),
		"yellow below 1": fmt.Sprintf(riskBody, 0, 80, 1), "no version": `{"yellow_from":50,"red_from":80}`, "no cut-offs": `{"version":1}`,
		"unknown field":   `{"yellow_from":50,"red_from":80,"version":1,"admin":true}`,
		"unknown action":  `{"yellow_from":50,"red_from":80,"version":1,"actions":{"green":{"recommendation":"a"},"yellow":{"recommendation":"a"},"red":{"recommendation":"a"},"blue":{"recommendation":"a"}}}`,
		"bidi in text":    `{"yellow_from":50,"red_from":80,"version":1,"actions":{"green":{"recommendation":"a"},"yellow":{"recommendation":"a"},"red":{"recommendation":"a‮b"}}}`,
		"missing a level": `{"yellow_from":50,"red_from":80,"version":1,"actions":{"green":{"recommendation":"a"}}}`,
	} {
		if w := putRisk(h, "tkmkb", "", body); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", name, w.Code)
		}
	}
	if w := putRisk(h, "tkmkb", "", fmt.Sprintf(riskBody, 55, 85, 0)); w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), "CONFIG_STALE") {
		t.Fatalf("an edit that started from an old version: want 409 CONFIG_STALE, got %d %s", w.Code, w.Body)
	}
	if cfg, _ := h.ConfigLive.Current(); cfg.YellowFrom != 70 || cfg.Version != 1 {
		t.Fatalf("a refused change must leave the setting alone: %+v", cfg)
	}
}

func TestDryRunShowsTheImpactAndSavesNothing(t *testing.T) {
	h := configHandler(5)
	for i, score := range []float64{10, 55, 60, 85, 95} { // green, yellow, yellow, red, red under 50/80
		id := fmt.Sprintf("s-%d", i)
		h.Store.Upsert(domain.ReferralRequest{ReferralID: id, DoctorID: "d-1", OriginFacilityID: "f", DestinationFacilityID: "g", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
			domain.RiskDecision{ReferralID: id, Score: score, Decision: "x", Status: "SCORED"})
	}
	h.Store.Upsert(domain.ReferralRequest{ReferralID: "dummy", DoctorID: "d-1", OriginFacilityID: "f", DestinationFacilityID: "g", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "dummy", Score: 99, Status: "SCORED", SignalsSource: "backend-dummy"})
	w := putRisk(h, "tkmkb", "?dry_run=true", `{"yellow_from":60,"red_from":90}`) // no version needed for a preview
	var got struct{ Impact riskImpact }
	if err := json.Unmarshal(w.Body.Bytes(), &got); w.Code != http.StatusOK || err != nil {
		t.Fatalf("dry run: %d %s", w.Code, w.Body)
	}
	// r-1 from crudHandler has score 10 (green) and counts too: 6 model-scored rows, the dummy one does not.
	i := got.Impact
	if i.Total != 6 || i.Current["green"] != 2 || i.Current["yellow"] != 2 || i.Current["red"] != 2 || i.Proposed["green"] != 3 || i.Proposed["yellow"] != 2 || i.Proposed["red"] != 1 || i.Changed != 2 || i.Note == "" {
		t.Fatalf("impact: %+v", i)
	}
	if cfg, ok := h.ConfigLive.Current(); ok {
		t.Fatalf("a dry run must save nothing: %+v", cfg)
	}
}
