package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"mime"
	"net/http"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

// scoreBudget is the sync scoring budget; beyond it the referral proceeds (fail-open).
const (
	scoreBudget = 300 * time.Millisecond
	maxBody     = 32 << 10
)

type ReferralHandler struct {
	Decisions service.DecisionService
	Queue     service.Queue           // nil in tests
	Store     *repository.MemoryStore // demo list/detail/audit store; nil = those endpoints return empty/404
	// AllowClientContext trusts request.Context (doctor history). Demo only: a real client could lower its own risk.
	AllowClientContext bool
}

type apiError struct {
	Code          string `json:"code"`
	Message       string `json:"message"`
	CorrelationID string `json:"correlation_id"`
}

func (h ReferralHandler) Score(w http.ResponseWriter, r *http.Request) {
	cid := r.Header.Get("X-Correlation-ID")
	if !idRe.MatchString(cid) { // client-controlled and logged: allow-list, else generate
		b := make([]byte, 8)
		_, _ = rand.Read(b)
		cid = hex.EncodeToString(b)
	}
	w.Header().Set("X-Correlation-ID", cid)

	if mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mt != "application/json" {
		writeJSON(w, http.StatusUnsupportedMediaType, apiError{"UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json", cid})
		return
	}
	key := r.Header.Get("Idempotency-Key")
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var request domain.ReferralRequest
	err := dec.Decode(&request)
	if err == nil && dec.More() {
		err = errors.New("trailing data")
	}
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		writeJSON(w, http.StatusRequestEntityTooLarge, apiError{"PAYLOAD_TOO_LARGE", "Request body too large", cid})
		return
	}
	if err == nil && !idRe.MatchString(key) {
		err = errors.New("bad idempotency key")
	}
	if err == nil {
		err = validate(request, h.AllowClientContext)
	}
	if err != nil {
		// err text names the field only, never echoes input
		writeJSON(w, http.StatusBadRequest, apiError{"INVALID_REQUEST", "Request failed validation", cid})
		return
	}
	request.ReferralID = key // Idempotency-Key = referral_no
	if !h.AllowClientContext {
		request.Context = domain.ReferralContext{DestIsNearest: true}
	}

	// Emergency referrals are never held; scored retrospectively only.
	if request.IsEmergency {
		h.accepted(w, r, request, cid, "emergency_retrospective")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), scoreBudget)
	defer cancel()
	result, err := h.Decisions.Evaluate(ctx, request)
	if err != nil {
		h.accepted(w, r, request, cid, "scoring_unavailable")
		return
	}
	if h.Store != nil {
		h.Store.Upsert(request, result)
	}
	writeJSON(w, http.StatusOK, result)
}

func (h ReferralHandler) accepted(w http.ResponseWriter, r *http.Request, req domain.ReferralRequest, cid, reason string) {
	log.Printf(`{"event":"score_async","reason":%q,"referral_id":%q,"correlation_id":%q}`, reason, req.ReferralID, cid)
	if h.Queue != nil {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), time.Second)
		defer cancel()
		if err := h.Queue.Enqueue(ctx, req, reason); err != nil {
			log.Printf(`{"event":"enqueue_failed","referral_id":%q,"correlation_id":%q}`, req.ReferralID, cid)
		}
	}
	writeJSON(w, http.StatusAccepted, domain.RiskDecision{ReferralID: req.ReferralID, Status: "ACCEPTED_ASYNC"})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func (h ReferralHandler) List(w http.ResponseWriter, _ *http.Request) {
	items := []domain.StoredReferral{}
	if h.Store != nil {
		items = h.Store.List()
	}
	writeJSON(w, http.StatusOK, items)
}

func (h ReferralHandler) Get(w http.ResponseWriter, r *http.Request) {
	if id := r.PathValue("id"); h.Store != nil && idRe.MatchString(id) {
		if item, ok := h.Store.Get(id); ok {
			writeJSON(w, http.StatusOK, item)
			return
		}
	}
	writeJSON(w, http.StatusNotFound, apiError{"NOT_FOUND", "Referral not found", ""})
}

const maxAuditBody = 8 << 10 // same as the Next proxy

// Audit records a verifier/TKMKB outcome. shortcut: reviewer is whatever the trusted Next proxy sends (it fills it
// from the session); per-user identity must come from the credential itself once backend auth stops being one shared token.
func (h ReferralHandler) Audit(w http.ResponseWriter, r *http.Request) {
	if mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mt != "application/json" {
		writeJSON(w, http.StatusUnsupportedMediaType, apiError{"UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json", ""})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxAuditBody)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var body struct {
		ReferralID string `json:"referral_id"`
		Reviewer   string `json:"reviewer"`
		Outcome    string `json:"outcome"`
		Note       string `json:"note"`
	}
	err := dec.Decode(&body)
	if err == nil && dec.More() {
		err = errors.New("trailing data")
	}
	if err == nil {
		err = validateAudit(body.ReferralID, body.Reviewer, body.Outcome, body.Note)
	}
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		writeJSON(w, http.StatusRequestEntityTooLarge, apiError{"PAYLOAD_TOO_LARGE", "Request body too large", ""})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{"INVALID_REQUEST", "Request failed validation", ""})
		return
	}
	audit := domain.AuditReview{Reviewer: body.Reviewer, Outcome: body.Outcome, Note: body.Note, ReviewedAt: time.Now().UTC().Format(time.RFC3339)}
	if h.Store == nil || !h.Store.AddAudit(body.ReferralID, audit) {
		writeJSON(w, http.StatusNotFound, apiError{"NOT_FOUND", "Referral not found", ""})
		return
	}
	writeJSON(w, http.StatusCreated, audit)
}
