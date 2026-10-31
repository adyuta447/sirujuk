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
)

const validAudit = `{"referral_id":"r-1","reviewer":"Siti","outcome":"valid","note":"ok"}`

func TestASecondFinalDecisionIsRefused(t *testing.T) {
	h, store := crudHandler(fixedML{score: 10}) // r-1 is yellow: a verifier may settle it
	if w := doAs("verifikator", h.Audit, "POST", "", validAudit); w.Code != http.StatusCreated {
		t.Fatalf("first final audit: %d %s", w.Code, w.Body)
	}
	for _, role := range []string{"verifikator", "tkmkb"} {
		flip := strings.Replace(validAudit, `"valid"`, `"tidak-valid"`, 1)
		if w := doAs(role, h.Audit, "POST", "", flip); w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), "DECISION_FINAL") {
			t.Errorf("%s flipping a final decision: want 409 DECISION_FINAL, got %d %s", role, w.Code, w.Body)
		}
	}
	clarify := strings.Replace(validAudit, `"valid"`, `"perlu-klarifikasi"`, 1)
	if w := doAs("verifikator", h.Audit, "POST", "", clarify); w.Code != http.StatusCreated {
		t.Errorf("asking for clarification is not a decision and stays open, got %d", w.Code)
	}
	if item, _ := store.Get("r-1"); len(item.Audits) != 2 || item.Audits[0].Outcome != domain.OutcomeValid {
		t.Fatalf("the first verdict must stand: %+v", item.Audits)
	}
}

func TestNoEditOrRescoreAfterTheFinalDecision(t *testing.T) {
	h, store := crudHandler(fixedML{score: 90}) // a re-score would turn r-1 red
	if w := doAs("verifikator", h.Audit, "POST", "", validAudit); w.Code != http.StatusCreated {
		t.Fatalf("audit: %d", w.Code)
	}
	for name, w := range map[string]*httptest.ResponseRecorder{
		"edit":    doAs("verifikator", h.Update, "PUT", "r-1", editBody),
		"rescore": doAs("tkmkb", h.Rescore, "POST", "r-1", ""),
	} {
		if w.Code != http.StatusConflict {
			t.Errorf("%s after final: want 409, got %d %s", name, w.Code, w.Body)
		}
	}
	if item, _ := store.Get("r-1"); item.Decision.Decision != "yellow" || item.Request.DiagnosisCode != "J06.9" || len(item.History) != 0 {
		t.Fatalf("a final referral changed: %+v", item)
	}
}

func TestRedClaimIsReleasedOnlyByTKMKBAfterTheLatestScore(t *testing.T) {
	scored := time.Now().UTC()
	at := func(d time.Duration) string { return scored.Add(d).Format(time.RFC3339) }
	cases := map[string]struct {
		audit domain.AuditReview
		claim string
		final bool
	}{
		"verifier approval":               {domain.AuditReview{Role: roleVerifikator, Outcome: domain.OutcomeValid, ReviewedAt: at(time.Minute)}, domain.ClaimHeld, false},
		"TKMKB verdict on an older score": {domain.AuditReview{Role: roleTKMKB, Outcome: domain.OutcomeValid, ReviewedAt: at(-time.Hour)}, domain.ClaimHeld, false},
		"TKMKB verdict on this score":     {domain.AuditReview{Role: roleTKMKB, Outcome: domain.OutcomeValid, ReviewedAt: at(time.Minute)}, domain.ClaimReleased, true},
	}
	for name, c := range cases {
		r := domain.StoredReferral{Decision: domain.RiskDecision{Decision: "red", ScoredAt: scored.Format(time.RFC3339)}, Audits: []domain.AuditReview{c.audit}}
		if r.Derive(); r.ClaimStatus != c.claim || r.Final != c.final {
			t.Errorf("%s: got %s/%v, want %s/%v", name, r.ClaimStatus, r.Final, c.claim, c.final)
		}
	}
}

func TestSameIdempotencyKeyWithOtherContentIsAConflict(t *testing.T) {
	h, _ := crudHandler(fixedML{score: 5})
	if w := postScore(h, "k-1", scoreBody("d-1", "I10", "a")); w.Code != http.StatusOK {
		t.Fatalf("first: %d %s", w.Code, w.Body)
	}
	if w := postScore(h, "k-1", scoreBody("d-1", "I10", "b")); w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), "IDEMPOTENCY_CONFLICT") {
		t.Fatalf("want 409 IDEMPOTENCY_CONFLICT, got %d %s", w.Code, w.Body)
	}
}

func TestScoreRejectsMalformedDiagnosisAndSameOriginAndDestination(t *testing.T) {
	h, _ := crudHandler(fixedML{score: 5})
	for name, body := range map[string]string{
		"not ICD-10":                    scoreBody("d-1", "ZZZ.99", "a"),
		"origin = destination":          strings.Replace(scoreBody("d-1", "I10", "a"), `"f-2"`, `"f-1"`, 1),
		"same place, other letter case": strings.Replace(scoreBody("d-1", "I10", "a"), `"f-2"`, `"F-1"`, 1),
	} {
		if w := postScore(h, "v-1", body); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", name, w.Code)
		}
	}
}

func TestDoctorNeverReceivesTheScore(t *testing.T) {
	item := domain.StoredReferral{Decision: domain.RiskDecision{Score: 72.5, Decision: "red", Reasons: []domain.Reason{{Code: "X"}}}}
	raw, _ := json.Marshal(shown(item, roleDokter))
	var got struct{ Decision map[string]any }
	_ = json.Unmarshal(raw, &got)
	if got.Decision["decision"] != "red" || got.Decision["reasons"] == nil {
		t.Fatalf("doctor view must keep category and reasons: %s", raw)
	}
	for _, internal := range []string{"score", "signals", "model_version"} {
		if _, has := got.Decision[internal]; has {
			t.Fatalf("doctor view must not carry %q: %s", internal, raw)
		}
	}
	raw, _ = json.Marshal(shown(item, roleVerifikator))
	if !strings.Contains(string(raw), `"score":72.5`) {
		t.Fatalf("verifier keeps the score: %s", raw)
	}
}

func TestSessionAnswers204OnlyForASignedInUser(t *testing.T) {
	var a AuthHandler
	if w := doAs("dokter", a.Session, "GET", "", ""); w.Code != http.StatusNoContent || w.Body.Len() != 0 {
		t.Fatalf("signed in: want empty 204, got %d %q", w.Code, w.Body)
	}
	if w := doAs("", a.Session, "GET", "", ""); w.Code != http.StatusForbidden {
		t.Fatalf("no actor: want 403, got %d", w.Code)
	}
}

func scoreBody(doctor, dx, narrative string) string {
	return fmt.Sprintf(`{"doctor_id":%q,"origin_facility_id":"f-1","destination_facility_id":"f-2","diagnosis_code":%q,"reason":"x","reason_category":"clinical","clinical_narrative":%q,"issued_at":%q}`,
		doctor, dx, narrative, time.Now().Format(time.RFC3339Nano))
}

func postScore(h ReferralHandler, key, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "/", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Idempotency-Key", key)
	r.Header.Set("X-Actor", "verif@demo.id")
	r.Header.Set("X-Actor-Role", "verifikator") // scoring is for verifier and TKMKB, as in the Next proxy
	w := httptest.NewRecorder()
	h.Score(w, r)
	return w
}

func TestEditCannotReassignAReferralToAnotherDoctorOrFacility(t *testing.T) {
	h, store := crudHandler(fixedML{score: 5})
	for name, edited := range map[string]string{
		"other doctor":       strings.Replace(editBody, "{", `{"doctor_id":"d-9",`, 1),
		"other origin":       strings.Replace(editBody, "{", `{"origin_facility_id":"f-9",`, 1),
		"other destination":  strings.Replace(editBody, "{", `{"destination_facility_id":"f-9",`, 1),
		"same doctor resent": strings.Replace(editBody, "{", `{"doctor_id":"d-1",`, 1), // identity is not editable at all
	} {
		if w := doAs("verifikator", h.Update, "PUT", "r-1", edited); w.Code != http.StatusBadRequest {
			t.Errorf("%s: moving a referral to another doctor or facility must be refused (400), got %d", name, w.Code)
		}
	}
	if item, _ := store.Get("r-1"); item.Request.DoctorID != "d-1" || item.Request.OriginFacilityID != "f-1" || item.Request.DestinationFacilityID != "f-2" {
		t.Fatalf("identity fields changed: %+v", item.Request)
	}
	if w := doAs("verifikator", h.Update, "PUT", "r-1", editBody); w.Code != http.StatusOK {
		t.Fatalf("editing the clinical fields must still work, got %d %s", w.Code, w.Body)
	}
}

func TestSeededReferralsWithFacilityNamesCanBeEdited(t *testing.T) {
	// Seed rows use the facility's name (with spaces) as its id. Identity fields cannot change on edit, so an edit must
	// not be rejected because of how they are spelled.
	h, store := crudHandler(fixedML{score: 5})
	store.UpsertSynthetic(domain.ReferralRequest{ReferralID: "r-seed", DoctorID: "d-001", OriginFacilityID: "Puskesmas Kecamatan Gambir", DestinationFacilityID: "RSUD Pasar Rebo",
		DiagnosisCode: "J06.9", Reason: "Keterbatasan alat", ReasonCategory: "equipment", IssuedAt: time.Now().AddDate(0, 0, -80)},
		domain.RiskDecision{ReferralID: "r-seed", Score: 5, Decision: "green", Status: "SCORED"})
	edit := `{"diagnosis_code":"J06.9","reason":"Keterbatasan alat","clinical_narrative":"batuk pilek tiga hari"}`
	if w := doAs("verifikator", h.Update, "PUT", "r-seed", edit); w.Code != http.StatusOK {
		t.Fatalf("editing a seeded row must work, got %d %s", w.Code, w.Body)
	}
	if w := doAs("verifikator", h.Rescore, "POST", "r-seed", ""); w.Code != http.StatusOK {
		t.Fatalf("re-scoring a seeded row must work, got %d", w.Code)
	}
}

func TestLoweringARedToGreenDoesNotReleaseTheClaim(t *testing.T) {
	h, store := crudHandler(fixedML{score: 5}) // any re-score comes back green
	store.Upsert(domain.ReferralRequest{ReferralID: "red-9", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "red-9", Score: 90, Decision: "red", Status: "SCORED", ScoredAt: time.Now().UTC().Format(time.RFC3339)})
	if w := doAs("tkmkb", h.Update, "PUT", "red-9", editBody); w.Code != http.StatusOK {
		t.Fatalf("edit: %d %s", w.Code, w.Body)
	}
	for i := 0; i < 25; i++ { // more re-scores than History keeps
		_ = store.Rescore(domain.ReferralRequest{ReferralID: "red-9", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
			domain.RiskDecision{ReferralID: "red-9", Score: 5, Decision: "green", Status: "SCORED", ScoredAt: time.Now().UTC().Format(time.RFC3339)})
	}
	item, _ := store.Get("red-9")
	if item.Decision.Decision != "green" || item.ClaimStatus != domain.ClaimHeld || item.Final || !item.Held {
		t.Fatalf("a red lowered by edits must stay held: %+v", item)
	}
	if w := doAs("verifikator", h.Audit, "POST", "", `{"referral_id":"red-9","reviewer":"V","outcome":"valid","note":"ok"}`); w.Code != http.StatusForbidden {
		t.Fatalf("a verifier may not decide a held referral, got %d", w.Code)
	}
	if w := doAs("verifikator", h.Update, "PUT", "red-9", editBody); w.Code != http.StatusForbidden {
		t.Fatalf("a verifier may not edit a held referral, got %d", w.Code)
	}
	if w := doAs("tkmkb", h.Audit, "POST", "", `{"referral_id":"red-9","reviewer":"T","outcome":"valid","note":"ok"}`); w.Code != http.StatusCreated {
		t.Fatalf("TKMKB audit: %d", w.Code)
	}
	if item, _ := store.Get("red-9"); item.ClaimStatus != domain.ClaimReleased || !item.Final {
		t.Fatalf("a TKMKB audit after the latest score releases it: %+v", item)
	}
}

func TestReferralsSavedBeforeHeldExistedAreStillHeldWhenHistoryWasRed(t *testing.T) {
	r := domain.StoredReferral{Decision: domain.RiskDecision{Decision: "green", ScoredAt: "2026-10-31T00:00:00Z"},
		History: []domain.ScoreSnapshot{{Decision: "red"}}}
	if r.Derive(); r.ClaimStatus != domain.ClaimHeld || r.Final {
		t.Fatalf("legacy red-in-history must count as held: %+v", r)
	}
}

func TestDoctorNeverSeesTheHeldFlag(t *testing.T) {
	raw, _ := json.Marshal(shown(domain.StoredReferral{Held: true, Decision: domain.RiskDecision{Decision: "green"}}, roleDokter))
	if strings.Contains(string(raw), `"held"`) {
		t.Fatalf("doctor must not learn that a referral was once red: %s", raw)
	}
}

func TestAuditTimeIsComparedAsATimeNotAsAString(t *testing.T) {
	for name, c := range map[string]struct {
		reviewedAt string
		claim      string
	}{
		"same second as a fractional score, before it": {"2026-10-31T10:00:00Z", domain.ClaimHeld},
		"next second":                  {"2026-10-31T10:00:01Z", domain.ClaimReleased},
		"unreadable time fails closed": {"yesterday", domain.ClaimHeld},
		"missing time fails closed":    {"", domain.ClaimHeld},
	} {
		r := domain.StoredReferral{Decision: domain.RiskDecision{Decision: "red", ScoredAt: "2026-10-31T10:00:00.500Z"},
			Audits: []domain.AuditReview{{Role: roleTKMKB, Outcome: domain.OutcomeValid, ReviewedAt: c.reviewedAt}}}
		if r.Derive(); r.ClaimStatus != c.claim {
			t.Errorf("%s: got %s, want %s", name, r.ClaimStatus, c.claim)
		}
	}
}
