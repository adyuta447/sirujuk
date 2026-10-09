package handler

import (
	"encoding/json"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
	"net/http"
	"time"
)

type ReferralHandler struct {
	Decisions service.DecisionService
	Store     *repository.MemoryStore
}

func (h ReferralHandler) Score(w http.ResponseWriter, r *http.Request) {
	var request domain.ReferralRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	result, err := h.Decisions.Evaluate(r.Context(), request)
	if err != nil {
		http.Error(w, "decision service unavailable", http.StatusBadGateway)
		return
	}
	if h.Store != nil {
		h.Store.Upsert(request, result)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h ReferralHandler) List(w http.ResponseWriter, r *http.Request) {
	items := []domain.StoredReferral{}
	if h.Store != nil {
		items = h.Store.List()
	}
	writeJSON(w, items)
}

func (h ReferralHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if h.Store != nil {
		if item, ok := h.Store.Get(id); ok {
			writeJSON(w, item)
			return
		}
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func (h ReferralHandler) Audit(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ReferralID string `json:"referral_id"`
		Reviewer   string `json:"reviewer"`
		Outcome    string `json:"outcome"`
		Note       string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ReferralID == "" || body.Outcome == "" {
		http.Error(w, "invalid audit", http.StatusBadRequest)
		return
	}
	if body.Reviewer == "" {
		body.Reviewer = "verifikator"
	}
	audit := domain.AuditReview{Reviewer: body.Reviewer, Outcome: body.Outcome, Note: body.Note, ReviewedAt: time.Now().UTC().Format(time.RFC3339)}
	if h.Store == nil || !h.Store.AddAudit(body.ReferralID, audit) {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(audit)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
