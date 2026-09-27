package handler

import (
	"encoding/json"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
	"net/http"
)

type ReferralHandler struct{ Decisions service.DecisionService }

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
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
