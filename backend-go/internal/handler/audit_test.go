package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/seed"
	"github.com/sirujuk/backend-go/internal/service"
)

func audit(h ReferralHandler, body string) int {
	req := httptest.NewRequest("POST", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Audit(rec, req)
	return rec.Code
}

func TestAuditValidationAndStore(t *testing.T) {
	store := repository.NewMemoryStore()
	seed.Run(store, 3)
	h := ReferralHandler{Store: store}
	good := `{"referral_id":"r-001","reviewer":"Siti","outcome":"valid","note":"ok"}`
	cases := []struct {
		name, body string
		want       int
	}{
		{"ok", good, http.StatusCreated},
		{"unknown referral", strings.Replace(good, "r-001", "r-999", 1), http.StatusNotFound},
		{"outcome outside allow-list", strings.Replace(good, `"valid"`, `"approved"`, 1), http.StatusBadRequest},
		{"missing reviewer", `{"referral_id":"r-001","outcome":"valid"}`, http.StatusBadRequest},
		{"unknown field", strings.Replace(good, "}", `,"x":1}`, 1), http.StatusBadRequest},
		{"control character in note", strings.Replace(good, `"ok"`, `"a\u0000b"`, 1), http.StatusBadRequest},
		{"note over 2000 chars", strings.Replace(good, `"ok"`, `"`+strings.Repeat("a", 2001)+`"`, 1), http.StatusBadRequest},
		{"note of 2000 chars", strings.Replace(good, `"ok"`, `"`+strings.Repeat("a", 2000)+`"`, 1), http.StatusCreated},
		{"body too large", strings.Replace(good, `"ok"`, `"`+strings.Repeat("a", 9000)+`"`, 1), http.StatusRequestEntityTooLarge},
	}
	for _, c := range cases {
		if got := audit(h, c.body); got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, got, c.want)
		}
	}
	if item, _ := store.Get("r-001"); len(item.Audits) != 2 {
		t.Fatalf("only the two valid audits may be stored, got %d", len(item.Audits))
	}
}

func TestDummyScoringIsOptInAndLabelled(t *testing.T) {
	dummy := ReferralHandler{Decisions: service.DecisionService{Dummy: true}, Store: repository.NewMemoryStore()}
	if c := call(dummy, "R9", valid("")); c != http.StatusOK {
		t.Fatalf("dummy scoring must answer 200, got %d", c)
	}
	item, ok := dummy.Store.Get("R9")
	if !ok || item.Decision.SignalsSource != "backend-dummy" || item.Decision.ModelVersion != service.DummyVersion {
		t.Fatalf("dummy decision must be labelled, got %+v", item.Decision)
	}
	// Without the flag the ML path is used, so a down ML never yields a fake score.
	real := ReferralHandler{Decisions: service.DecisionService{ML: failML{}}}
	if c := call(real, "R10", valid("")); c != http.StatusAccepted {
		t.Fatalf("ML down without DUMMY_SCORING must be 202, got %d", c)
	}
}

func TestPatientNameIsValidated(t *testing.T) {
	h := ReferralHandler{Decisions: service.DecisionService{Dummy: true}}
	if c := call(h, "R11", valid(`,"patient_name":"Budi"`)); c != http.StatusOK {
		t.Fatalf("plain name must pass, got %d", c)
	}
	if c := call(h, "R12", valid(`,"patient_name":"Bu‮di"`)); c != http.StatusBadRequest {
		t.Fatalf("bidi override in patient_name must be rejected, got %d", c)
	}
}
