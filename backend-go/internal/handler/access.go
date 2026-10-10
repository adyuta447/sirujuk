package handler

import (
	"net/http"
	"strings"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/middleware"
)

const roleDokter, roleDinkes = "dokter", "dinkes"

// actorIn returns the signed-in user's email and role (set by the Next.js proxy from the signed session) when the
// role is one of allowed. No actor or another role is a 403: every write and every patient-level read needs a known user.
func actorIn(w http.ResponseWriter, r *http.Request, allowed ...string) (sub, role string, ok bool) {
	sub, role = middleware.Actor(r)
	for _, a := range allowed {
		if role == a {
			return sub, role, true
		}
	}
	writeJSON(w, http.StatusForbidden, apiError{"FORBIDDEN_ROLE", "This role may not do that", ""})
	return "", "", false
}

// visibility says which referrals a caller may read. A doctor sees only their own (the account's doctor_id), Dinkes
// sees no patient rows at all, and verifier/TKMKB see everything. A request with no actor is a service call.
type visibility struct {
	all      bool
	doctorID string
	denied   bool
}

func (h ReferralHandler) visibilityOf(r *http.Request) visibility {
	sub, role := middleware.Actor(r)
	switch role {
	case "":
		return visibility{all: true}
	case roleVerifikator, roleTKMKB:
		return visibility{all: true}
	case roleDokter:
		if h.Users == nil {
			return visibility{denied: true}
		}
		u, found, err := h.Users.Find(r.Context(), sub)
		if err != nil || !found || u.DoctorID == "" {
			return visibility{denied: true}
		}
		return visibility{doctorID: u.DoctorID}
	}
	return visibility{denied: true}
}

func (v visibility) allows(item domain.StoredReferral) bool {
	return v.all || (!v.denied && item.Request.DoctorID == v.doctorID)
}

// mayChangeRed keeps edits and re-scores of red referrals with TKMKB, as the final decision on them is theirs.
// It writes the 403 itself and reports whether the caller may go on.
func mayChangeRed(w http.ResponseWriter, item domain.StoredReferral, role string) bool {
	if item.Decision.Decision == "red" && role != roleTKMKB {
		writeJSON(w, http.StatusForbidden, apiError{"FORBIDDEN_LEVEL", "Only TKMKB may change a red referral", ""})
		return false
	}
	return true
}

// redact limits what a role receives (data minimization, UU PDP). TKMKB sees the full evidence; a verifier sees the
// patient only as initials; a doctor sees their own referral's category, reasons and the clarification requests, but
// not model internals, score history, other users' audit trail or the patient's name. A request without an actor is a
// service call and gets the full record.
func redact(item domain.StoredReferral, role string) domain.StoredReferral {
	switch role {
	case roleVerifikator:
		item.Request.PatientName = maskName(item.Request.PatientName)
	case roleDokter:
		item.Request.PatientName = ""
		item.History = nil
		item.Decision.Features, item.Decision.Indicators = nil, nil
		item.Decision.Signals = domain.MLScores{}
		item.Decision.ModelVersion, item.Decision.ModelCategory, item.Decision.DiagnosisVersion = "", "", ""
		item.Decision.YellowFrom, item.Decision.RedFrom = 0, 0
		item.Audits = clarificationRequestsOnly(item.Audits)
	}
	return item
}

// clarificationRequestsOnly keeps the verifier's request text and time, and drops who wrote it and every other outcome.
func clarificationRequestsOnly(audits []domain.AuditReview) []domain.AuditReview {
	out := []domain.AuditReview{}
	for _, a := range audits {
		if a.Outcome == domain.OutcomeClarification {
			out = append(out, domain.AuditReview{Outcome: a.Outcome, Note: a.Note, ReviewedAt: a.ReviewedAt})
		}
	}
	return out
}

// maskName keeps the first letter of each word: "Bambang Sutrisno" -> "B*** S***".
func maskName(name string) string {
	words := strings.Fields(name)
	for i, w := range words {
		r := []rune(w)
		words[i] = string(r[0]) + "***"
	}
	return strings.Join(words, " ")
}
