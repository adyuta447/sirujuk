package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// twoDoctorsHandler has referrals of d-1 and d-2 and a doctor account linked to d-1 only.
func twoDoctorsHandler() ReferralHandler {
	h, store := crudHandler(fixedML{})
	store.Upsert(domain.ReferralRequest{ReferralID: "r-2", DoctorID: "d-2", OriginFacilityID: "f", DestinationFacilityID: "g", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "r-2", Score: 5, Decision: "green", Status: "SCORED"})
	users := repository.NewMemoryUsers("")
	_ = users.Put(context.Background(), domain.User{Email: "dokter@demo.id", Nama: "dr", Role: "dokter", DoctorID: "d-1"})
	_ = users.Put(context.Background(), domain.User{Email: "tanpa@demo.id", Nama: "dr", Role: "dokter"})
	h.Users = users
	return h
}

func asUser(email, role string, handler http.HandlerFunc, method, id, body string) *httptest.ResponseRecorder {
	r := requestFor(method, id, body)
	r.Header.Set("X-Actor", email)
	r.Header.Set("X-Actor-Role", role)
	w := httptest.NewRecorder()
	handler(w, r)
	return w
}

func TestDoctorSeesOnlyOwnReferrals(t *testing.T) {
	h := twoDoctorsHandler()
	list := asUser("dokter@demo.id", "dokter", h.List, "GET", "", "")
	if !strings.Contains(list.Body.String(), `"r-1"`) || strings.Contains(list.Body.String(), `"r-2"`) {
		t.Fatalf("doctor must see only own referrals: %s", list.Body)
	}
	if w := asUser("dokter@demo.id", "dokter", h.Get, "GET", "r-2", ""); w.Code != http.StatusNotFound {
		t.Fatalf("another doctor's referral must be 404, got %d", w.Code)
	}
	if w := asUser("tanpa@demo.id", "dokter", h.List, "GET", "", ""); strings.Contains(w.Body.String(), "r-") {
		t.Fatalf("a doctor account without doctor_id sees nothing: %s", w.Body)
	}
}

func TestDinkesSeesNoPatientRows(t *testing.T) {
	h := twoDoctorsHandler()
	if w := asUser("d@demo.id", "dinkes", h.List, "GET", "", ""); strings.Contains(w.Body.String(), "r-") {
		t.Fatalf("Dinkes must get aggregates only: %s", w.Body)
	}
	stats := asUser("d@demo.id", "dinkes", h.Stats, "GET", "", "")
	if stats.Code != http.StatusOK || !strings.Contains(stats.Body.String(), `"dokter":[]`) {
		t.Fatalf("Dinkes stats must have no per-doctor rows: %d %s", stats.Code, stats.Body)
	}
}

func TestDoctorMayAnswerOnlyOwnReferral(t *testing.T) {
	h := twoDoctorsHandler()
	body := `{"author":"dr","text":"alat rusak"}`
	if w := asUser("dokter@demo.id", "dokter", h.Clarify, "POST", "r-1", body); w.Code != http.StatusCreated {
		t.Fatalf("own referral: %d", w.Code)
	}
	if w := asUser("dokter@demo.id", "dokter", h.Clarify, "POST", "r-2", body); w.Code != http.StatusForbidden {
		t.Fatalf("other doctor's referral: want 403, got %d", w.Code)
	}
	if w := asUser("d@demo.id", "dinkes", h.Clarify, "POST", "r-1", body); w.Code != http.StatusForbidden {
		t.Fatalf("Dinkes may not write clarifications: %d", w.Code)
	}
	item, _ := h.Store.Get("r-1")
	if len(item.Clarifications) != 1 || item.Clarifications[0].Actor != "dokter@demo.id" {
		t.Fatalf("the actor's email must be recorded: %+v", item.Clarifications)
	}
}

func TestAuditRecordsActorEmail(t *testing.T) {
	h, store := crudHandler(fixedML{})
	if w := doAs("verifikator", h.Audit, "POST", "", auditBody("valid")); w.Code != http.StatusCreated {
		t.Fatal(w.Code)
	}
	item, _ := store.Get("r-1")
	if item.Audits[0].Actor != "uji@demo.id" || item.Audits[0].Reviewer != "Siti" {
		t.Fatalf("audit must keep both display name and account email: %+v", item.Audits[0])
	}
}

func requestFor(method, id, body string) *http.Request {
	r := httptest.NewRequest(method, "/", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r.SetPathValue("id", id)
	return r
}

func TestRedactionPerRole(t *testing.T) {
	item := domain.StoredReferral{
		Request: domain.ReferralRequest{PatientName: "Bambang Sutrisno", DoctorID: "d-1"},
		Decision: domain.RiskDecision{Decision: "red", Score: 90, ModelVersion: "m", Features: &domain.FeatureSnapshot{}, Indicators: []byte(`{}`),
			Reasons: []domain.Reason{{Code: "NS_ABOVE_PEER_P95"}}},
		History: []domain.ScoreSnapshot{{Score: 1}},
		Audits: []domain.AuditReview{
			{Reviewer: "Rina", Actor: "rina@x.id", Role: "verifikator", Outcome: domain.OutcomeClarification, Note: "mohon jelaskan"},
			{Reviewer: "Budi", Actor: "budi@x.id", Role: "tkmkb", Outcome: domain.OutcomeInvalid, Note: "internal"},
		},
	}
	if got := redact(item, roleTKMKB); got.Request.PatientName != "Bambang Sutrisno" || len(got.Audits) != 2 {
		t.Fatal("TKMKB sees the full evidence")
	}
	if got := redact(item, roleVerifikator); got.Request.PatientName != "B*** S***" {
		t.Fatalf("verifier sees initials only: %q", got.Request.PatientName)
	}
	d := redact(item, roleDokter)
	if d.Request.PatientName != "" || d.History != nil || d.Decision.Features != nil || d.Decision.Indicators != nil || d.Decision.ModelVersion != "" {
		t.Fatalf("doctor must not get name, history or model internals: %+v", d)
	}
	if len(d.Decision.Reasons) != 1 || len(d.Audits) != 1 || d.Audits[0].Actor != "" || d.Audits[0].Reviewer != "" || d.Audits[0].Note != "mohon jelaskan" {
		t.Fatalf("doctor gets reasons and the clarification request, without who wrote it or other outcomes: %+v", d.Audits)
	}
	if len(item.Audits) != 2 || item.Request.PatientName == "" {
		t.Fatal("redaction must not mutate the stored copy")
	}
}

func TestVerifierCannotEditOrRescoreRed(t *testing.T) {
	h, store := crudHandler(fixedML{})
	store.Upsert(domain.ReferralRequest{ReferralID: "r-1", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "r-1", Score: 90, Decision: "red", Status: "SCORED"})
	if w := doAs("verifikator", h.Update, "PUT", "r-1", editBody); w.Code != http.StatusForbidden {
		t.Fatalf("update red as verifier: %d", w.Code)
	}
	if w := doAs("verifikator", h.Rescore, "POST", "r-1", ""); w.Code != http.StatusForbidden {
		t.Fatalf("rescore red as verifier: %d", w.Code)
	}
	if w := doAs("tkmkb", h.Rescore, "POST", "r-1", ""); w.Code != http.StatusOK {
		t.Fatalf("TKMKB may: %d", w.Code)
	}
}

func TestRegionComesFromTheDirectoryNotFromTheIssuer(t *testing.T) {
	h, store := crudHandler(fixedML{})
	h.Regions = func(id string) string {
		if id == "f-known" {
			return "Jakarta Pusat"
		}
		return ""
	}
	body := func(origin, region string) string {
		return fmt.Sprintf(`{"doctor_id":"d-1","origin_facility_id":%q,"destination_facility_id":"g","diagnosis_code":"I10","reason":"x","clinical_narrative":"nyeri kepala berulang","origin_wilayah":%q,"issued_at":%q}`, origin, region, time.Now().Format(time.RFC3339))
	}
	post := func(key, b string) {
		r := requestFor("POST", "", b)
		r.Header.Set("Idempotency-Key", key)
		h.Score(httptest.NewRecorder(), r)
	}
	post("R-known", body("f-known", "Papua")) // forged region for a known facility
	post("R-other", body("f-unlisted", "Bali"))
	if it, _ := store.Get("R-known"); it.Request.OriginWilayah != "Jakarta Pusat" {
		t.Fatalf("a known facility's region must come from the directory: %q", it.Request.OriginWilayah)
	}
	if it, _ := store.Get("R-other"); it.Request.OriginWilayah != "Bali" {
		t.Fatalf("an unlisted facility keeps the issuer's value: %q", it.Request.OriginWilayah)
	}
}
