package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"mime"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/middleware"
	"github.com/sirujuk/backend-go/internal/repository"
)

const (
	maxEditBody = 16 << 10
	editBudget  = 3 * time.Second // operator action, not the patient path: wait for ML, never fall back to a guess
)

func decodeStrict(w http.ResponseWriter, r *http.Request, max int64, v any) error {
	if mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mt != "application/json" {
		return errors.New("content type")
	}
	r.Body = http.MaxBytesReader(w, r.Body, max)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return err
	}
	if dec.More() {
		return errors.New("trailing data")
	}
	return nil
}

// changedFields names (never values) what an edit altered, so the log shows who changed which evidence without
// copying patient text into it.
func changedFields(a, b domain.ReferralRequest) []string {
	var out []string
	for name, differs := range map[string]bool{
		"doctor_id": a.DoctorID != b.DoctorID, "origin_facility_id": a.OriginFacilityID != b.OriginFacilityID,
		"destination_facility_id": a.DestinationFacilityID != b.DestinationFacilityID,
		"diagnosis_code":          a.DiagnosisCode != b.DiagnosisCode, "reason": a.Reason != b.Reason,
		"clinical_narrative": a.ClinicalNarrative != b.ClinicalNarrative,
	} {
		if differs {
			out = append(out, name)
		}
	}
	sort.Strings(out)
	return out
}

// auditLog records a state-changing action by the signed-in user. The stored audit rows live in memory only, so
// this log line is the durable trail. detail is field names or an outcome, never patient text.
func auditLog(r *http.Request, event, id string, detail []string) {
	actor, role := middleware.Actor(r)
	log.Printf(`{"event":%q,"referral_id":%q,"actor":%q,"role":%q,"detail":%q}`, event, id, actor, role, strings.Join(detail, ","))
}

func badRequest(w http.ResponseWriter) {
	writeJSON(w, http.StatusBadRequest, apiError{"INVALID_REQUEST", "Request failed validation", ""})
}

// storeError maps store failures to API errors. ErrStorage means nothing was changed.
func storeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		notFound(w)
	case errors.Is(err, repository.ErrLimit):
		writeJSON(w, http.StatusConflict, apiError{"LIMIT_REACHED", "Limit reached for this referral", ""})
	default:
		writeJSON(w, http.StatusServiceUnavailable, apiError{"STORAGE_UNAVAILABLE", "Could not save; nothing was changed", ""})
	}
}

// roleMayDecide enforces the proposal's split: yellow can be settled by a verifier, but the final decision on a red
// referral (which holds claim payment) belongs to TKMKB. Asking the doctor for clarification is open to both.
func roleMayDecide(store *repository.MemoryStore, id, role, outcome string) bool {
	if role == roleTKMKB || outcome == domain.OutcomeClarification {
		return true
	}
	item, ok := store.Get(id)
	return !ok || item.Decision.Decision != "red"
}

func notFound(w http.ResponseWriter) {
	writeJSON(w, http.StatusNotFound, apiError{"NOT_FOUND", "Referral not found", ""})
}

// rescore runs the stored (possibly edited) request through the ML service and replaces the current score;
// the previous one moves to History. Archived referrals are frozen.
func (h ReferralHandler) rescore(w http.ResponseWriter, r *http.Request, id string, req domain.ReferralRequest, role string) {
	ctx, cancel := context.WithTimeout(r.Context(), editBudget)
	defer cancel()
	d, err := h.Decisions.Evaluate(ctx, req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, apiError{"SCORING_UNAVAILABLE", "Scoring service unavailable; nothing was changed", ""})
		return
	}
	h.Store.Upsert(req, d)
	item, _ := h.Store.Get(id)
	writeJSON(w, http.StatusOK, redact(item, role))
}

// Rescore: POST /referrals/{id}/rescore
func (h ReferralHandler) Rescore(w http.ResponseWriter, r *http.Request) {
	_, role, ok := actorIn(w, r, roleVerifikator, roleTKMKB)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if h.Store == nil || !idRe.MatchString(id) {
		notFound(w)
		return
	}
	item, found := h.Store.Get(id)
	if !found || item.Archived {
		notFound(w)
		return
	}
	if !mayChangeRed(w, item, role) {
		return
	}
	auditLog(r, "referral_rescored", id, nil)
	h.rescore(w, r, id, item.Request, role)
}

// Update: PUT /referrals/{id}. Only clinical fields change; identity, patient and issue time stay as issued.
func (h ReferralHandler) Update(w http.ResponseWriter, r *http.Request) {
	_, role, ok := actorIn(w, r, roleVerifikator, roleTKMKB)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if h.Store == nil || !idRe.MatchString(id) {
		notFound(w)
		return
	}
	item, found := h.Store.Get(id)
	if !found || item.Archived {
		notFound(w)
		return
	}
	if !mayChangeRed(w, item, role) {
		return
	}
	var body struct {
		DoctorID              string `json:"doctor_id"`
		OriginFacilityID      string `json:"origin_facility_id"`
		DestinationFacilityID string `json:"destination_facility_id"`
		DiagnosisCode         string `json:"diagnosis_code"`
		Reason                string `json:"reason"`
		ClinicalNarrative     string `json:"clinical_narrative"`
	}
	if err := decodeStrict(w, r, maxEditBody, &body); err != nil {
		badRequest(w)
		return
	}
	req := item.Request
	req.DoctorID, req.OriginFacilityID, req.DestinationFacilityID = body.DoctorID, body.OriginFacilityID, body.DestinationFacilityID
	req.DiagnosisCode, req.Reason, req.ClinicalNarrative = body.DiagnosisCode, body.Reason, body.ClinicalNarrative
	if !h.AllowClientContext {
		req.Context = domain.ReferralContext{}
	}
	if err := validate(req, h.AllowClientContext); err != nil {
		badRequest(w)
		return
	}
	auditLog(r, "referral_updated", id, changedFields(item.Request, req))
	h.rescore(w, r, id, req, role)
}

// Archive: DELETE /referrals/{id}. Soft delete only: scores and audits must stay reproducible for appeals.
func (h ReferralHandler) Archive(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Reviewer string `json:"reviewer"`
		Note     string `json:"note"`
	}
	if err := decodeStrict(w, r, maxAuditBody, &body); err != nil ||
		validateAudit(id, body.Reviewer, domain.OutcomeValid, body.Note) != nil || body.Note == "" {
		badRequest(w)
		return
	}
	actor, _, ok := actorIn(w, r, roleTKMKB)
	if !ok {
		return
	}
	a := domain.AuditReview{Reviewer: body.Reviewer, Actor: actor, Role: roleTKMKB, Outcome: domain.OutcomeArchived, Note: body.Note, ReviewedAt: time.Now().UTC().Format(time.RFC3339)}
	if h.Store == nil {
		notFound(w)
		return
	}
	if err := h.Store.Archive(id, a); err != nil {
		storeError(w, err)
		return
	}
	auditLog(r, "referral_archived", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

const maxClarificationText = 4000

// Clarify: POST /referrals/{id}/clarifications. Append-only: a doctor's answer is never edited or deleted.
func (h ReferralHandler) Clarify(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Author string `json:"author"`
		Text   string `json:"text"`
	}
	if err := decodeStrict(w, r, maxEditBody, &body); err != nil || !idRe.MatchString(id) ||
		text(body.Author, maxName, true, false) != nil || text(body.Text, maxClarificationText, true, true) != nil {
		badRequest(w)
		return
	}
	actor, role, ok := actorIn(w, r, roleDokter, roleVerifikator, roleTKMKB)
	if !ok {
		return
	}
	if role == roleDokter && !h.ownsReferral(r, id) {
		writeJSON(w, http.StatusForbidden, apiError{"FORBIDDEN_OWNER", "A doctor may only answer their own referrals", ""})
		return
	}
	c := domain.Clarification{Author: body.Author, Actor: actor, Text: body.Text, At: time.Now().UTC().Format(time.RFC3339)}
	if h.Store == nil {
		notFound(w)
		return
	}
	if err := h.Store.AddClarification(id, c); err != nil {
		storeError(w, err)
		return
	}
	auditLog(r, "clarification_added", id, nil)
	writeJSON(w, http.StatusCreated, c)
}

// ownsReferral is true when the signed-in doctor's account is linked to the doctor_id on this referral.
func (h ReferralHandler) ownsReferral(r *http.Request, id string) bool {
	if h.Store == nil {
		return false
	}
	item, ok := h.Store.Get(id)
	return ok && h.visibilityOf(r).allows(item)
}
