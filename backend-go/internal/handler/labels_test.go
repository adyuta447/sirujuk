package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

func TestLabelsExportRowsOnlyToServiceAndSkipSeed(t *testing.T) {
	store := repository.NewMemoryStore()
	ns := 0.4
	req := func(id string) domain.ReferralRequest {
		return domain.ReferralRequest{ReferralID: id, DoctorID: "d1", DiagnosisCode: "I10", ReasonCategory: "staff", IssuedAt: time.Now()}
	}
	dec := func(id string) domain.RiskDecision {
		return domain.RiskDecision{ReferralID: id, Decision: "green", RandomAudit: true,
			Features: &domain.FeatureSnapshot{Doctor: domain.DoctorFeatures{Stratum: "urban|klinik", N90: 30, NS90: &ns}}}
	}
	store.Upsert(req("a"), dec("a"))
	store.Upsert(req("b"), dec("b"))
	store.UpsertSynthetic(req("s"), dec("s"))
	if err := store.AddAudit("a", domain.AuditReview{Outcome: domain.OutcomeInvalid}); err != nil {
		t.Fatal(err)
	}
	h := ReferralHandler{Store: store}
	get := func(role string) (int, labelsResponse) {
		r := httptest.NewRequest("GET", "/api/v1/labels", nil)
		if role != "" {
			r.Header.Set("X-Actor", "siti@demo.id")
			r.Header.Set("X-Actor-Role", role)
		}
		rec := httptest.NewRecorder()
		h.Labels(rec, r)
		var out labelsResponse
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return rec.Code, out
	}

	code, svc := get("")
	if code != http.StatusOK || len(svc.Rows) != 2 || svc.Labeled != 1 || svc.Positive != 1 || svc.RandomAudited != 1 || svc.Ready {
		t.Fatalf("service export: %d %+v", code, svc)
	}
	for _, row := range svc.Rows {
		if row.ReferralID == "s" {
			t.Fatal("seed rows must never become training labels")
		}
		if row.ReferralID == "a" && (row.Label == nil || *row.Label != 1 || row.Reason != "staff" || *row.Stratum != "urban|klinik") {
			t.Fatalf("row a: %+v", row)
		}
	}
	if code, tk := get("tkmkb"); code != http.StatusOK || tk.Rows != nil || tk.Labeled != 1 {
		t.Fatalf("tkmkb gets counts only: %d %+v", code, tk)
	}
	if code, _ := get("verifikator"); code != http.StatusForbidden {
		t.Fatalf("verifikator: got %d, want 403", code)
	}
}
