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
	"net/url"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/middleware"
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
	Queue     service.Queue // nil in tests
	// Regions maps a facility to its region from a trusted directory, so statistics do not depend on what the issuer
	// typed. nil or unknown facility = keep the issuer's value.
	Regions func(facilityID string) string
	Ready   func(context.Context) map[string]string // dependency labels for /ready; nil = not wired
	Users   repository.UserRepository               // resolves actor -> doctor_id; nil = doctors see nothing
	Results service.Store                           // idempotent replay + async results (Redis); nil in tests
	// ConfigLive and ConfigStore serve and change the national risk configuration (see config_handler.go); nil = 503.
	// Cost is the owner's assumption behind the cost estimate in /stats; nil = no rupiah figure is produced.
	Cost *CostAssumption
	// Hospitals is the destination directory behind GET /hospitals and the destination assessment; nil = empty.
	Hospitals   repository.HospitalDirectory
	ConfigLive  *service.LiveConfig
	ConfigStore repository.RiskConfigRepository
	Store       *repository.MemoryStore // demo list/detail/audit store; nil = those endpoints return empty/404
	// AllowClientContext trusts request.Context (doctor history). Demo only: a real client could lower its own risk.
	AllowClientContext bool
}

type apiError struct {
	Code          string `json:"code"`
	Message       string `json:"message"`
	CorrelationID string `json:"correlation_id"`
}

func (h ReferralHandler) Score(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleVerifikator, roleTKMKB); !ok { // same roles as the Next proxy's bolehSkor
		return
	}
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
	if h.Regions != nil {
		if region := h.Regions(request.OriginFacilityID); region != "" {
			request.OriginWilayah = region
		}
	}
	if !h.AllowClientContext {
		request.Context = domain.ReferralContext{}
	}

	// An existing referral is never re-scored here, or a reused key would overwrite a red or archived one and skip
	// the TKMKB-only rule; edits go through Update/Rescore. Get also loads from Firestore, so other instances count.
	// The same content is a retry and gets the stored result; different content under the same key is a conflict.
	if h.Store != nil {
		if item, found := h.Store.Get(key); found {
			replayOrConflict(w, item, request, cid)
			return
		}
	}
	if h.Results != nil { // same Idempotency-Key => same stored result, never re-scored
		if d, err := h.Results.Load(r.Context(), key); err == nil && d != nil {
			writeJSON(w, http.StatusOK, d)
			return
		}
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
		if existing, err := h.Store.Insert(request, result); errors.Is(err, repository.ErrExists) {
			replayOrConflict(w, existing, request, cid) // another request got here first
			return
		}
	}
	if h.Results != nil {
		if err := h.Results.Save(context.WithoutCancel(r.Context()), result); err != nil {
			log.Printf(`{"event":"result_save_failed","referral_id":%q,"correlation_id":%q}`, request.ReferralID, cid)
		}
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

// List answers GET /referrals. Without limit or cursor it is the plain array older clients expect; with ?limit=N
// (and ?cursor= from the previous page's next) it is {items, next, total, summary}; see page.
func (h ReferralHandler) List(w http.ResponseWriter, r *http.Request) {
	var visible []domain.StoredReferral
	_, role := middleware.Actor(r)
	if h.Store != nil {
		view := h.visibilityOf(r)
		for _, it := range h.Store.List() {
			if view.allows(it) {
				visible = append(visible, it)
			}
		}
	}
	// Query() silently drops a pair it cannot decode (a broken cursor would become "first page"), so parse it ourselves.
	q, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		badRequest(w)
		return
	}
	if q.Has("limit") || q.Has("cursor") {
		page(w, q, visible, role)
		return
	}
	items := make([]any, 0, len(visible))
	for _, it := range visible {
		items = append(items, shown(it, role))
	}
	writeJSON(w, http.StatusOK, items)
}

func (h ReferralHandler) Get(w http.ResponseWriter, r *http.Request) {
	if id := r.PathValue("id"); h.Store != nil && idRe.MatchString(id) {
		if item, ok := h.Store.Get(id); ok && h.visibilityOf(r).allows(item) {
			_, role := middleware.Actor(r)
			writeJSON(w, http.StatusOK, shown(item, role))
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
	// Identity comes from the proxy-set X-Actor headers (the signed session), never from the body. No known user = no write.
	actor, role, ok := actorIn(w, r, roleVerifikator, roleTKMKB)
	if !ok {
		return
	}
	if h.Store != nil && !roleMayDecide(h.Store, body.ReferralID, role, body.Outcome) {
		writeJSON(w, http.StatusForbidden, apiError{"FORBIDDEN_ROLE", "Only TKMKB may make the final decision on a red referral", ""})
		return
	}
	audit := domain.AuditReview{Reviewer: body.Reviewer, Actor: actor, Role: role, Outcome: body.Outcome, Note: body.Note, ReviewedAt: time.Now().UTC().Format(domain.OrderedTime)}
	if h.Store == nil {
		notFound(w)
		return
	}
	if err := h.Store.AddAudit(body.ReferralID, audit); err != nil {
		storeError(w, err)
		return
	}
	auditLog(r, "audit_recorded", body.ReferralID, []string{body.Outcome})
	writeJSON(w, http.StatusCreated, audit)
}

// ReadyCheck answers GET /ready with ok/down labels per dependency (no secrets, no data), so a deploy can see that
// Redis, Firestore and the KNS list are really connected instead of silently running degraded.
func (h ReferralHandler) ReadyCheck(w http.ResponseWriter, r *http.Request) {
	status := map[string]string{}
	if h.Ready != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		status = h.Ready(ctx)
	}
	writeJSON(w, http.StatusOK, status)
}

// replayOrConflict answers a score request for a referral number that is already stored.
func replayOrConflict(w http.ResponseWriter, existing domain.StoredReferral, request domain.ReferralRequest, cid string) {
	if sameReferral(existing.Request, request) {
		writeJSON(w, http.StatusOK, existing.Decision)
		return
	}
	writeJSON(w, http.StatusConflict, apiError{"IDEMPOTENCY_CONFLICT", "A different referral already uses this Idempotency-Key", cid})
}

// sameReferral compares what the issuer wrote. issued_at is left out on purpose: a client retry stamps a new time.
func sameReferral(a, b domain.ReferralRequest) bool {
	return a.DoctorID == b.DoctorID && a.OriginFacilityID == b.OriginFacilityID && a.DestinationFacilityID == b.DestinationFacilityID &&
		a.DiagnosisCode == b.DiagnosisCode && a.Reason == b.Reason && a.ReasonCategory == b.ReasonCategory &&
		a.ClinicalNarrative == b.ClinicalNarrative && a.PatientName == b.PatientName && a.IsEmergency == b.IsEmergency
}
