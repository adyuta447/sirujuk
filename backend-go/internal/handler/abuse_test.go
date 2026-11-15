package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// Abuse cases (QA 30 Oct 2026, cyber security P0): every role tries every action that could change a claim outcome
// without a TKMKB decision. r-1 is yellow and open, red-1 is red and open, fin-1 already carries a verifier's final
// "valid". Each cell runs on a fresh store, and besides the status code it checks that nothing changed when the
// action was refused: a 4xx that still wrote something is a fraud hole too.

const noActor = ""

var abuseRoles = []string{roleVerifikator, roleTKMKB, roleDinkes, roleDokter, noActor}

func abuseFixture(t *testing.T) (ReferralHandler, *repository.MemoryStore) {
	t.Helper()
	h, store := crudHandler(fixedML{score: 90}) // any re-score would turn the referral red
	scored := time.Now().UTC().Add(-time.Minute).Format(time.RFC3339)
	for id, decision := range map[string]string{"red-1": "red", "fin-1": "yellow"} {
		store.Upsert(domain.ReferralRequest{ReferralID: id, DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
			domain.RiskDecision{ReferralID: id, Score: 10, Decision: decision, Status: "SCORED", ScoredAt: scored})
	}
	if err := store.AddAudit("fin-1", domain.AuditReview{Role: roleVerifikator, Actor: "v@uji.id", Reviewer: "V", Outcome: domain.OutcomeValid, ReviewedAt: scored}); err != nil {
		t.Fatal(err)
	}
	return h, store
}

func TestAbuseMatrixRoleByAction(t *testing.T) {
	const (
		created, ok, noContent, bad, forbidden, conflict = http.StatusCreated, http.StatusOK, http.StatusNoContent, http.StatusBadRequest, http.StatusForbidden, http.StatusConflict
	)
	auditOn := func(id, outcome string) string {
		return `{"referral_id":"` + id + `","reviewer":"X","outcome":"` + outcome + `","note":"catatan"}`
	}
	actions := []struct {
		name string
		run  func(h ReferralHandler, role string) *httptest.ResponseRecorder
		want map[string]int // per role; noActor and every role not listed want 403
	}{
		{"final verdict on an open yellow", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Audit, "POST", "", auditOn("r-1", "valid"))
		}, map[string]int{roleVerifikator: created, roleTKMKB: created}},
		{"release an open red claim", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Audit, "POST", "", auditOn("red-1", "valid"))
		}, map[string]int{roleTKMKB: created}},
		{"flip a final verdict", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Audit, "POST", "", auditOn("fin-1", "tidak-valid"))
		}, map[string]int{roleVerifikator: conflict, roleTKMKB: conflict}},
		{"repeat a final verdict", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Audit, "POST", "", auditOn("fin-1", "valid"))
		}, map[string]int{roleVerifikator: conflict, roleTKMKB: conflict}},
		{"edit evidence after final", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Update, "PUT", "fin-1", editBody)
		}, map[string]int{roleVerifikator: conflict, roleTKMKB: conflict}},
		{"rescore after final", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Rescore, "POST", "fin-1", "")
		}, map[string]int{roleVerifikator: conflict, roleTKMKB: conflict}},
		// Full edit forms, as the old UI sent them: a partial body would fail validation for the wrong reason.
		{"move the referral to another doctor", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Update, "PUT", "r-1", `{"doctor_id":"d-001","origin_facility_id":"f-1","destination_facility_id":"f-2","diagnosis_code":"J06.9","reason":"alat","clinical_narrative":"batuk"}`)
		}, map[string]int{roleVerifikator: bad, roleTKMKB: bad}},
		{"move the referral to another facility", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Update, "PUT", "r-1", `{"doctor_id":"d-1","origin_facility_id":"f-1","destination_facility_id":"f-9","diagnosis_code":"J06.9","reason":"alat","clinical_narrative":"batuk"}`)
		}, map[string]int{roleVerifikator: bad, roleTKMKB: bad}},
		{"edit an open red referral", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Update, "PUT", "red-1", editBody)
		}, map[string]int{roleTKMKB: ok}},
		{"archive", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Archive, "DELETE", "r-1", `{"reviewer":"X","note":"arsip"}`)
		}, map[string]int{roleTKMKB: noContent}},
		{"answer a clarification on someone else's referral", func(h ReferralHandler, role string) *httptest.ResponseRecorder {
			return doAs(role, h.Clarify, "POST", "r-1", `{"author":"X","text":"jawaban"}`) // the test actor owns no doctor_id
		}, map[string]int{roleVerifikator: created, roleTKMKB: created}},
	}

	for _, a := range actions {
		for _, role := range abuseRoles {
			h, store := abuseFixture(t)
			before, _ := store.Get("fin-1")
			w := a.run(h, role)
			want, listed := a.want[role]
			if !listed {
				want = forbidden
			}
			name := role
			if name == noActor {
				name = "no actor"
			}
			if w.Code != want {
				t.Errorf("%s by %s: got %d, want %d (%s)", a.name, name, w.Code, want, w.Body)
			}
			// Invariants that must hold whatever the status code.
			after, _ := store.Get("fin-1")
			if after.ClaimStatus != before.ClaimStatus || after.Final != before.Final || len(after.Audits) != len(before.Audits) ||
				after.Decision.Score != before.Decision.Score || after.Request.DiagnosisCode != before.Request.DiagnosisCode {
				t.Errorf("%s by %s changed the finalized referral: %+v -> %+v", a.name, name, before, after)
			}
			for _, id := range []string{"r-1", "red-1"} {
				if item, _ := store.Get(id); item.Request.DoctorID != "d-1" || item.Request.DestinationFacilityID != "f-2" {
					t.Errorf("%s by %s moved %s to %s / %s", a.name, name, id, item.Request.DoctorID, item.Request.DestinationFacilityID)
				}
			}
			if red, _ := store.Get("red-1"); red.ClaimStatus == domain.ClaimReleased && role != roleTKMKB {
				t.Errorf("%s by %s released a red claim without TKMKB", a.name, name)
			}
		}
	}
}

// A verifier's approval while a referral was yellow must not release its claim if it is later scored red, and a
// re-used referral number (anyone holding the service token) must not reopen or overwrite a final referral.
func TestAbuseFinalReferralCannotBeReopenedThroughOtherDoors(t *testing.T) {
	h, store := abuseFixture(t)
	before, _ := store.Get("fin-1")
	postScore(h, "fin-1", scoreBody("d-9", "I21.9", "nyeri dada berat"))
	store.Upsert(before.Request, domain.RiskDecision{ReferralID: "fin-1", Score: 90, Decision: "red", Status: "SCORED", ScoredAt: time.Now().UTC().Format(time.RFC3339)}) // e.g. a late async score
	after, _ := store.Get("fin-1")
	if after.Request.DoctorID != "d-1" || after.Request.DiagnosisCode != before.Request.DiagnosisCode {
		t.Fatalf("score with a reused number overwrote a final referral: %+v", after.Request)
	}
	if after.Decision.Decision == "red" && after.ClaimStatus == domain.ClaimReleased {
		t.Fatalf("a verifier's yellow approval released a claim that is now red: %+v", after)
	}
}

// QA 31 Oct (r-101): one TKMKB account edited the evidence of a red referral until the re-score came out green, and
// the held claim became "normal" without any audit. Lowering the score must never release the claim: it stays held
// until a TKMKB final audit on the latest score, and a verifier still may not settle or edit it.
func TestAbuseLoweringRedThroughAnEditKeepsTheClaimHeld(t *testing.T) {
	h, store := crudHandler(fixedML{score: 1}) // every re-score comes out green
	scored := time.Now().UTC().Add(-time.Minute).Format(time.RFC3339)
	store.Upsert(domain.ReferralRequest{ReferralID: "red-1", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "red-1", Score: 100, Decision: "red", Status: "SCORED", ScoredAt: scored})

	for i := 0; i < 3; i++ { // repeated edits: the red trace must survive more than one re-score
		if w := doAs(roleTKMKB, h.Update, "PUT", "red-1", editBody); w.Code != http.StatusOK {
			t.Fatalf("TKMKB edit %d: %d %s", i, w.Code, w.Body)
		}
	}
	item, _ := store.Get("red-1")
	if item.Decision.Decision == "red" {
		t.Fatalf("scenario not reached: the re-score is still red (%v)", item.Decision.Score)
	}
	if item.ClaimStatus != domain.ClaimHeld || item.Final {
		t.Fatalf("lowering the score released the claim without an audit: %s final=%v", item.ClaimStatus, item.Final)
	}
	for name, w := range map[string]*httptest.ResponseRecorder{
		"verifier settles it": doAs(roleVerifikator, h.Audit, "POST", "", `{"referral_id":"red-1","reviewer":"V","outcome":"valid","note":"ok"}`),
		"verifier edits it":   doAs(roleVerifikator, h.Update, "PUT", "red-1", editBody),
	} {
		if w.Code != http.StatusForbidden {
			t.Errorf("%s after the downgrade: want 403, got %d", name, w.Code)
		}
	}
	if item, _ := store.Get("red-1"); item.ClaimStatus != domain.ClaimHeld {
		t.Fatalf("claim moved before TKMKB decided: %s", item.ClaimStatus)
	}
	if w := doAs(roleTKMKB, h.Audit, "POST", "", `{"referral_id":"red-1","reviewer":"T","outcome":"valid","note":"ok"}`); w.Code != http.StatusCreated {
		t.Fatalf("TKMKB final audit on the latest score: %d %s", w.Code, w.Body)
	}
	if item, _ := store.Get("red-1"); item.ClaimStatus != domain.ClaimReleased || !item.Final {
		t.Fatalf("only the TKMKB audit may release it, and then it must: %s final=%v", item.ClaimStatus, item.Final)
	}
}

// A red claim is released only by a TKMKB verdict on the score it carries now. Timestamps that merely sort after the
// score as text (a +07:00 offset from an import, whole seconds against a fractional score, junk) must not count.
func TestAbuseAuditTimeCannotBeGamedAgainstTheLatestScore(t *testing.T) {
	const scored = "2026-10-31T03:30:00.500Z"
	for name, c := range map[string]struct {
		reviewedAt string
		claim      string
	}{
		"WIB time that is really 6.5h before the score": {"2026-10-31T10:00:00+07:00", domain.ClaimHeld},
		"same second, before the fraction":              {"2026-10-31T03:30:00Z", domain.ClaimHeld},
		"unreadable":                                    {"besok pagi", domain.ClaimHeld},
		"missing":                                       {"", domain.ClaimHeld},
		"WIB time that really is after the score":       {"2026-10-31T10:31:00+07:00", domain.ClaimReleased},
	} {
		r := domain.StoredReferral{
			Decision: domain.RiskDecision{Decision: "red", ScoredAt: scored},
			Audits:   []domain.AuditReview{{Role: roleTKMKB, Outcome: domain.OutcomeValid, ReviewedAt: c.reviewedAt}},
		}
		if r.Derive(); r.ClaimStatus != c.claim {
			t.Errorf("%s (%q): claim %s, want %s", name, c.reviewedAt, r.ClaimStatus, c.claim)
		}
	}
}
