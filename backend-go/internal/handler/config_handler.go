package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/middleware"
)

type riskConfigResponse struct {
	domain.RiskConfig
	Source string `json:"source"` // configured | model_default (never configured: the ML service's own cut-offs apply)
	// ModelReference is what the model was fitted for, so the UI can show how far a national setting is from it.
	ModelReference struct {
		YellowFrom float64 `json:"yellow_from"`
		RedFrom    float64 `json:"red_from"`
	} `json:"model_reference"`
}

type riskImpact struct {
	Total    int            `json:"total"`
	Current  map[string]int `json:"current"`  // referrals per category with the cut-offs in force now
	Proposed map[string]int `json:"proposed"` // the same referrals under the proposed cut-offs
	Changed  int            `json:"changed"`
	Note     string         `json:"note"`
}

const impactNote = "Perkiraan dari skor tersimpan. Rujukan yang sudah ada baru berubah kategori bila dihitung ulang; klaim yang sudah ditahan tetap ditahan. Aturan jumlah lapisan minimum untuk merah tidak ikut disimulasikan."

func riskResponse(cfg domain.RiskConfig, configured bool) riskConfigResponse {
	out := riskConfigResponse{RiskConfig: cfg, Source: "model_default"}
	if configured {
		out.Source = "configured"
	}
	out.ModelReference.YellowFrom, out.ModelReference.RedFrom = domain.DefaultYellowFrom, domain.DefaultRedFrom
	return out
}

// RiskConfig: GET /config/risk
func (h ReferralHandler) RiskConfig(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleVerifikator, roleTKMKB, roleDinkes); !ok {
		return
	}
	if h.ConfigLive == nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{"CONFIG_UNAVAILABLE", "Risk configuration is not available", ""})
		return
	}
	cfg, ok := h.ConfigLive.Current()
	if !ok {
		cfg = domain.DefaultRiskConfig()
	}
	writeJSON(w, http.StatusOK, riskResponse(cfg, ok))
}

// UpdateRiskConfig: PUT /config/risk. Only TKMKB, because the cut-offs decide which claims are held. ?dry_run=true
// answers with the impact and saves nothing.
func (h ReferralHandler) UpdateRiskConfig(w http.ResponseWriter, r *http.Request) {
	actor, _, ok := actorIn(w, r, roleTKMKB)
	if !ok {
		return
	}
	if h.ConfigLive == nil || h.ConfigStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{"CONFIG_UNAVAILABLE", "Risk configuration is not available", ""})
		return
	}
	var body struct {
		YellowFrom *float64                         `json:"yellow_from"`
		RedFrom    *float64                         `json:"red_from"`
		Actions    map[string]domain.CategoryAction `json:"actions"`
		Version    *int                             `json:"version"` // the version this edit started from; 0 = never configured
	}
	if err := decodeStrict(w, r, maxEditBody, &body); err != nil || body.YellowFrom == nil || body.RedFrom == nil {
		badRequest(w)
		return
	}
	dry := r.URL.Query().Get("dry_run") == "true"
	if !dry && body.Version == nil {
		badRequest(w)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	cur, configured, err := h.ConfigStore.Load(ctx) // fresh, not this instance's cached copy
	if err != nil {
		storeError(w, err)
		return
	}
	if !configured {
		cur = domain.DefaultRiskConfig()
	}
	next := domain.RiskConfig{YellowFrom: *body.YellowFrom, RedFrom: *body.RedFrom, Actions: body.Actions}
	if len(next.Actions) == 0 {
		next.Actions = cur.Actions
	}
	if next.Validate() != nil {
		badRequest(w)
		return
	}
	for _, a := range next.Actions {
		if text(a.Recommendation, 200, true, false) != nil {
			badRequest(w)
			return
		}
	}
	if dry {
		writeJSON(w, http.StatusOK, map[string]any{"config": riskResponse(next, false), "impact": h.riskImpact(cur, next)})
		return
	}
	if *body.Version != cur.Version { // shortcut: read-then-write, so two simultaneous saves can still collide; a database precondition would close it
		writeJSON(w, http.StatusConflict, apiError{"CONFIG_STALE", "The configuration changed since you opened it; reload and try again", ""})
		return
	}
	next.Version, next.UpdatedBy, next.UpdatedAt = cur.Version+1, actor, time.Now().UTC().Format(domain.OrderedTime)
	if err := h.ConfigStore.Save(ctx, next); err != nil {
		storeError(w, err)
		return
	}
	h.ConfigLive.Set(next)
	_, role := middleware.Actor(r)
	auditLog(r, "risk_config_changed", "", []string{
		"yellow " + trim(cur.YellowFrom) + "->" + trim(next.YellowFrom), "red " + trim(cur.RedFrom) + "->" + trim(next.RedFrom), "by " + role,
	})
	writeJSON(w, http.StatusOK, map[string]any{"config": riskResponse(next, true), "impact": h.riskImpact(cur, next)})
}

// riskImpact counts how many scored referrals would change category under next, against the cut-offs in force (cur).
// Only rows scored by the real model count: the dummy engine's scores are on another scale.
func (h ReferralHandler) riskImpact(cur, next domain.RiskConfig) riskImpact {
	out := riskImpact{Current: map[string]int{"green": 0, "yellow": 0, "red": 0}, Proposed: map[string]int{"green": 0, "yellow": 0, "red": 0}, Note: impactNote}
	if h.Store == nil {
		return out
	}
	for _, it := range h.Store.List() {
		if it.Decision.Status != "SCORED" || it.Decision.SignalsSource == "backend-dummy" {
			continue
		}
		a, b := cur.CategoryOf(it.Decision.Score), next.CategoryOf(it.Decision.Score)
		out.Total++
		out.Current[a]++
		out.Proposed[b]++
		if a != b {
			out.Changed++
		}
	}
	return out
}

func trim(f float64) string { return strconv.FormatFloat(f, 'f', -1, 64) }
