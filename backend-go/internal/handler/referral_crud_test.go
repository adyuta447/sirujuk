package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

type fixedML struct{ score float64 }

func (f fixedML) Predict(context.Context, domain.ScoringInput) (domain.MLScores, error) {
	return domain.MLScores{Score: f.score, ModelVersion: "test", Reasons: []domain.Reason{{Code: "X", Detail: "alasan"}}}, nil
}

func crudHandler(ml service.MLServiceClient) (ReferralHandler, *repository.MemoryStore) {
	store := repository.NewMemoryStore()
	req := domain.ReferralRequest{
		ReferralID: "r-1", DoctorID: "d-1", OriginFacilityID: "f-1", OriginWilayah: "Jakarta Utara", DestinationFacilityID: "f-2",
		DiagnosisCode: "J06.9", Reason: "alat", IssuedAt: time.Now(),
	}
	store.Upsert(req, domain.RiskDecision{ReferralID: "r-1", Score: 10, Decision: "yellow", Status: "SCORED"})
	h := ReferralHandler{Store: store, Decisions: service.DecisionService{ML: ml, Engine: service.DecisionEngine{YellowFrom: 7.8, RedFrom: 45}}}
	return h, store
}

func do(handler http.HandlerFunc, method, id, body string) *httptest.ResponseRecorder {
	return doAs("tkmkb", handler, method, id, body)
}

// doAs sends the request the way the Next.js proxy does: the signed-in user's role in X-Actor-Role.
func doAs(role string, handler http.HandlerFunc, method, id, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "/", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if role != "" {
		r.Header.Set("X-Actor", "uji@demo.id")
		r.Header.Set("X-Actor-Role", role)
	}
	r.SetPathValue("id", id)
	w := httptest.NewRecorder()
	handler(w, r)
	return w
}

const editBody = `{"doctor_id":"d-1","origin_facility_id":"f-1","destination_facility_id":"f-2","diagnosis_code":"D12","reason":"klinis","clinical_narrative":"batuk"}`

func TestUpdateRescoresThroughMLAndKeepsHistory(t *testing.T) {
	h, store := crudHandler(fixedML{score: 90})
	if w := do(h.Update, "PUT", "r-1", editBody); w.Code != http.StatusOK {
		t.Fatalf("update: %d %s", w.Code, w.Body)
	}
	item, _ := store.Get("r-1")
	if item.Decision.Decision != "red" || item.Request.DiagnosisCode != "D12" || len(item.History) != 1 || item.History[0].Score != 10 {
		t.Fatalf("bad stored item: %+v", item)
	}
}

func TestUpdateRejectsBadInputAndUnknownID(t *testing.T) {
	h, _ := crudHandler(fixedML{})
	for name, c := range map[string]struct{ id, body string }{
		"unknown id":    {"nope", editBody},
		"bidi reason":   {"r-1", strings.Replace(editBody, "klinis", "a\\u202Eb", 1)},
		"unknown field": {"r-1", strings.Replace(editBody, "{", `{"is_emergency":true,`, 1)},
	} {
		if w := do(h.Update, "PUT", c.id, c.body); w.Code < 400 || w.Code >= 500 {
			t.Errorf("%s: want 4xx, got %d", name, w.Code)
		}
	}
}

func TestMLDownKeepsOldScore(t *testing.T) {
	h, store := crudHandler(failML{})
	if w := do(h.Rescore, "POST", "r-1", ""); w.Code != http.StatusBadGateway {
		t.Fatalf("want 502, got %d", w.Code)
	}
	if item, _ := store.Get("r-1"); item.Decision.Score != 10 || len(item.History) != 0 {
		t.Fatalf("score must be untouched: %+v", item)
	}
}

func TestArchiveHidesButKeepsRecord(t *testing.T) {
	h, store := crudHandler(fixedML{})
	if w := do(h.Archive, "DELETE", "r-1", `{"reviewer":"Budi","note":"duplikat"}`); w.Code != http.StatusNoContent {
		t.Fatalf("archive: %d", w.Code)
	}
	if len(store.List()) != 0 {
		t.Fatal("archived referral must leave the list")
	}
	if item, ok := store.Get("r-1"); !ok || !item.Archived || len(item.Audits) != 1 {
		t.Fatalf("record and its audit trail must be kept: %+v", item)
	}
	if w := do(h.Archive, "DELETE", "r-1", `{"reviewer":"Budi","note":"lagi"}`); w.Code != http.StatusNotFound {
		t.Fatalf("second archive: want 404, got %d", w.Code)
	}
	if w := do(h.Rescore, "POST", "r-1", ""); w.Code != http.StatusNotFound {
		t.Fatalf("archived referral is frozen: got %d", w.Code)
	}
	if w := do(h.Archive, "DELETE", "r-1", `{"reviewer":"Budi","note":""}`); w.Code != http.StatusBadRequest {
		t.Fatalf("note is required: got %d", w.Code)
	}
}

func TestStatsAreAggregatesWithoutPatientFields(t *testing.T) {
	h, _ := crudHandler(fixedML{})
	w := do(h.Stats, "GET", "", "")
	body := w.Body.String()
	if w.Code != 200 || !strings.Contains(body, `"Jakarta Utara"`) || strings.Contains(body, "patient") {
		t.Fatalf("%d %s", w.Code, body)
	}
}

func TestClarifyIsAppendOnlyAndValidated(t *testing.T) {
	h, store := crudHandler(fixedML{})
	if w := do(h.Clarify, "POST", "r-1", `{"author":"dr. Andi","text":"Alat USG rusak sejak Maret."}`); w.Code != http.StatusCreated {
		t.Fatalf("clarify: %d", w.Code)
	}
	if item, _ := store.Get("r-1"); len(item.Clarifications) != 1 {
		t.Fatalf("not stored: %+v", item)
	}
	for name, body := range map[string]string{
		"empty text":   `{"author":"a","text":""}`,
		"control char": `{"author":"a","text":"x\u0000y"}`,
		"extra field":  `{"author":"a","text":"x","at":"2020-01-01"}`,
	} {
		if w := do(h.Clarify, "POST", "r-1", body); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", name, w.Code)
		}
	}
	if w := do(h.Clarify, "POST", "nope", `{"author":"a","text":"x"}`); w.Code != http.StatusNotFound {
		t.Errorf("unknown id: got %d", w.Code)
	}
}

func TestOnlyTKMKBMayArchive(t *testing.T) {
	h, _ := crudHandler(fixedML{})
	for _, role := range []string{"verifikator", "dokter", ""} {
		if w := doAs(role, h.Archive, "DELETE", "r-1", `{"reviewer":"x","note":"n"}`); w.Code != http.StatusForbidden {
			t.Errorf("role %q: want 403, got %d", role, w.Code)
		}
	}
}

func auditBody(outcome string) string {
	return `{"referral_id":"r-1","reviewer":"Siti","outcome":"` + outcome + `","note":"ok"}`
}

func TestRedReferralFinalDecisionIsTKMKBOnly(t *testing.T) {
	h, store := crudHandler(fixedML{})
	store.Upsert(domain.ReferralRequest{ReferralID: "r-1", DoctorID: "d-1", OriginFacilityID: "f", DestinationFacilityID: "g", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "r-1", Score: 90, Decision: "red", Status: "SCORED"})

	if w := doAs("verifikator", h.Audit, "POST", "", auditBody("valid")); w.Code != http.StatusForbidden {
		t.Fatalf("verifier must not finalize red: %d", w.Code)
	}
	if w := doAs("", h.Audit, "POST", "", auditBody("perlu-klarifikasi")); w.Code != http.StatusForbidden {
		t.Fatalf("no identity, no write: %d", w.Code)
	}
	if w := doAs("verifikator", h.Audit, "POST", "", auditBody("perlu-klarifikasi")); w.Code != http.StatusCreated {
		t.Fatalf("verifier may ask for clarification: %d", w.Code)
	}
	if item, _ := store.Get("r-1"); item.Final || item.ClaimStatus != domain.ClaimHeld {
		t.Fatalf("clarification is not final, claim stays held: %+v", item)
	}
	if w := doAs("tkmkb", h.Audit, "POST", "", auditBody("valid")); w.Code != http.StatusCreated {
		t.Fatalf("TKMKB decides: %d", w.Code)
	}
	if item, _ := store.Get("r-1"); !item.Final || item.ClaimStatus != domain.ClaimReleased {
		t.Fatalf("valid by TKMKB releases the claim: %+v", item)
	}
}

func TestVerifierMaySettleYellow(t *testing.T) {
	h, _ := crudHandler(fixedML{})
	if w := doAs("verifikator", h.Audit, "POST", "", auditBody("valid")); w.Code != http.StatusCreated {
		t.Fatalf("yellow can be settled by a verifier: %d", w.Code)
	}
}
