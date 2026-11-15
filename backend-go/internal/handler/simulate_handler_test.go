package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/seed"
)

// captureML scores from its inputs, so a test can see that a changed input moves the score, and remembers what it got.
type captureML struct {
	last domain.ScoringInput
	fail bool
}

func (c *captureML) Predict(_ context.Context, in domain.ScoringInput) (domain.MLScores, error) {
	c.last = in
	if c.fail {
		return domain.MLScores{}, errors.New("ml down")
	}
	s := 10.0
	if in.Doctor.ToDominantDest {
		s += 50
	}
	if in.SisruteAvailable {
		s += 20
	}
	return domain.MLScores{Score: s, ModelVersion: "test", YellowFrom: 50, RedFrom: 80, Reasons: []domain.Reason{{Code: "HHI_HIGH_CONCENTRATION", Contribution: 2}}}, nil
}

func simHandler(ml *captureML) (ReferralHandler, *repository.MemoryStore) {
	h, store := crudHandler(ml)
	h.Hospitals = repository.MemoryHospitals(seed.Hospitals())
	h.Decisions.Engine.YellowFrom, h.Decisions.Engine.RedFrom = 50, 80
	store.Upsert(domain.ReferralRequest{ReferralID: "base-1", PatientName: "Nama Pasien", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "RS Harapan Kita",
		DiagnosisCode: "I21.0", Reason: "x", ReasonCategory: "clinical", ClinicalNarrative: "RAHASIA-NARASI", IssuedAt: time.Now().AddDate(0, 0, -3)},
		domain.RiskDecision{ReferralID: "base-1", Score: 10, Decision: "green", Status: "SCORED", ModelVersion: "test",
			Features: &domain.FeatureSnapshot{Doctor: domain.DoctorFeatures{N90: 30, N180: 60}, SisruteAgeDays: 4}})
	return h, store
}

func simulate(h ReferralHandler, role, body string) (*httptest.ResponseRecorder, map[string]any) {
	r := httptest.NewRequest("POST", "/api/v1/simulate", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if role != "" {
		r.Header.Set("X-Actor", role+"@demo.id")
		r.Header.Set("X-Actor-Role", role)
	}
	w := httptest.NewRecorder()
	h.Simulate(w, r)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w, out
}

func TestSimulationStartsFromWhatTheModelSawAndChangesOnlyWhatWasAsked(t *testing.T) {
	ml := &captureML{}
	h, store := simHandler(ml)
	before := store.Count()
	w, out := simulate(h, "verifikator", `{"base_referral_id":"base-1","inputs":{"to_dominant_dest":true}}`)
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if ml.last.Doctor.N90 != 30 || ml.last.Doctor.N180 != 60 || ml.last.SisruteAgeDays != 4 || !ml.last.Doctor.ToDominantDest || ml.last.Referral.DiagnosisCode != "I21.0" || ml.last.Referral.ReferralID != "simulation" {
		t.Fatalf("the model must get the stored features plus only the override: %+v", ml.last)
	}
	model := out["model"].(map[string]any)
	if out["simulated"] != true || model["score"] != 60.0 || model["category"] != "yellow" || out["delta_score"] != 50.0 || out["baseline"].(map[string]any)["same_model_version"] != true {
		t.Fatalf("result: %v", out)
	}
	if got := out["applied_inputs"].([]any); len(got) != 1 || got[0] != "to_dominant_dest" {
		t.Fatalf("applied inputs: %v", got)
	}
	if body := w.Body.String(); strings.Contains(body, "RAHASIA") || strings.Contains(body, "Nama Pasien") {
		t.Fatalf("a simulation must not echo patient data: %s", body)
	}
	item, _ := store.Get("base-1")
	if store.Count() != before || item.Decision.Score != 10 || len(item.History) != 0 {
		t.Fatalf("a simulation must store nothing and change nothing: %+v", item)
	}
}

func TestSimulationWithoutABaseNeedsADiagnosisAndAReasonAndStartsCold(t *testing.T) {
	ml := &captureML{}
	h, store := simHandler(ml)
	before := store.Count()
	for _, body := range []string{`{}`, `{"inputs":{"diagnosis_code":"I10"}}`, `{"inputs":{"reason_category":"clinical"}}`} {
		if w, _ := simulate(h, "tkmkb", body); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", body, w.Code)
		}
	}
	w, out := simulate(h, "tkmkb", `{"inputs":{"diagnosis_code":"I10","reason_category":"equipment","sisrute_available":true}}`)
	if w.Code != http.StatusOK || ml.last.Doctor.N90 != 0 || !ml.last.SisruteAvailable || out["baseline"] != nil || out["delta_score"] != nil || store.Count() != before {
		t.Fatalf("standalone: %d %s %+v", w.Code, w.Body, ml.last)
	}
}

func TestSimulationRefusesBadInputAndUnknownBases(t *testing.T) {
	h, store := simHandler(&captureML{})
	_ = store.Archive("base-1", domain.AuditReview{Role: roleTKMKB, Outcome: domain.OutcomeArchived, Note: "x"})
	for name, c := range map[string]struct {
		body string
		want int
	}{
		"unknown field": {`{"inputs":{"admin":true}}`, 400}, "bad diagnosis": {`{"inputs":{"diagnosis_code":"ZZZ.99","reason_category":"clinical"}}`, 400},
		"ns90 above 1": {`{"base_referral_id":"x","inputs":{"ns90":1.5}}`, 400}, "negative n90": {`{"inputs":{"n90":-1}}`, 400},
		"hhi too high": {`{"inputs":{"hhi180":10001}}`, 400}, "bidi narrative": {`{"inputs":{"clinical_narrative":"a‮b"}}`, 400},
		"bad reason": {`{"inputs":{"reason_category":"bribe"}}`, 400}, "bad competency": {`{"destination":{"competency":"mungkin"}}`, 400},
		"distance too far": {`{"destination":{"distance_km":5000}}`, 400}, "unknown base": {`{"base_referral_id":"nope"}`, 404},
		"archived base": {`{"base_referral_id":"base-1"}`, 404}, "bad base id": {`{"base_referral_id":"a b"}`, 404},
	} {
		if w, _ := simulate(h, "tkmkb", c.body); w.Code != c.want {
			t.Errorf("%s: want %d, got %d %s", name, c.want, w.Code, w.Body)
		}
	}
}

func TestSimulationAccessAndWhenTheModelIsNotThere(t *testing.T) {
	ml := &captureML{}
	h, store := simHandler(ml)
	before := store.Count()
	for _, role := range []string{"dokter", "dinkes", ""} {
		if w, _ := simulate(h, role, `{"base_referral_id":"base-1"}`); w.Code != http.StatusForbidden {
			t.Errorf("%q: want 403, got %d", role, w.Code)
		}
	}
	ml.fail = true
	if w, _ := simulate(h, "tkmkb", `{"base_referral_id":"base-1"}`); w.Code != http.StatusBadGateway || store.Count() != before {
		t.Fatalf("an ML failure is a 502, never a guessed score: %d", w.Code)
	}
	h.Decisions.Dummy = true
	if w, _ := simulate(h, "tkmkb", `{"base_referral_id":"base-1"}`); w.Code != http.StatusServiceUnavailable {
		t.Fatalf("the simulator never fakes the model: want 503, got %d", w.Code)
	}
}

func TestDestinationAssumptionsAreAssessedButNeverMoveTheScore(t *testing.T) {
	h, _ := simHandler(&captureML{})
	_, plain := simulate(h, "tkmkb", `{"base_referral_id":"base-1"}`)
	w, withDest := simulate(h, "tkmkb", `{"base_referral_id":"base-1","destination":{"distance_km":900,"competency":"tidak","equipment_available":false}}`)
	if w.Code != http.StatusOK {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if plain["model"].(map[string]any)["score"] != withDest["model"].(map[string]any)["score"] {
		t.Fatalf("distance, competency and equipment are not model inputs; the score must not move: %v vs %v", plain["model"], withDest["model"])
	}
	fit := withDest["destination_fit"].(map[string]any)
	if fit["verdict"] != "tidak_sesuai" || fit["affects_score"] != false || withDest["not_in_model"] == nil || plain["not_in_model"] != nil {
		t.Fatalf("assessment: %v", withDest)
	}
	// without assumptions the base referral's own destination is assessed from the directory: heart attack -> heart hospital
	if plainFit := plain["destination_fit"].(map[string]any); plainFit["verdict"] != "belum_terverifikasi" {
		t.Fatalf("the stored destination: %v", plainFit)
	}
}
