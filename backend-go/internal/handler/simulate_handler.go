package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// simInputs are the inputs the model really uses. Each one that is set replaces the value taken from the base
// referral (or from a cold start).
type simInputs struct {
	DiagnosisCode     *string  `json:"diagnosis_code"`
	ReasonCategory    *string  `json:"reason_category"`
	ClinicalNarrative *string  `json:"clinical_narrative"`
	N90               *int     `json:"n90"`
	NS90              *float64 `json:"ns90"`
	N180              *int     `json:"n180"`
	HHI180            *float64 `json:"hhi180"`
	ToDominantDest    *bool    `json:"to_dominant_dest"`
	DestIsNearest     *bool    `json:"dest_is_nearest"`
	SisruteAvailable  *bool    `json:"sisrute_available"`
	SisruteAgeDays    *float64 `json:"sisrute_age_days"`
}

// simDestination is about the destination hospital. None of it is a model input: it feeds the destination assessment
// only, and the response says so.
type simDestination struct {
	FacilityID         string   `json:"facility_id"`
	DistanceKm         *float64 `json:"distance_km"`
	Competency         string   `json:"competency"` // sesuai | sebagian | tidak
	EquipmentAvailable *bool    `json:"equipment_available"`
}

const simNotice = "Simulasi: hasil tidak disimpan dan tidak mengubah rujukan mana pun. Skor dihitung oleh model SiRujuk yang sama dengan skor asli, yang dilatih pada data sintetis."

// Simulate: POST /simulate. A what-if on the real model: it never stores anything and never guesses; if the ML
// service cannot answer, neither can the simulator.
// shortcut: no per-user rate limit; ML instances are capped on Cloud Run, which bounds the cost. Add one if it is abused.
func (h ReferralHandler) Simulate(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleVerifikator, roleTKMKB); !ok {
		return
	}
	var body struct {
		BaseReferralID string          `json:"base_referral_id"`
		Inputs         simInputs       `json:"inputs"`
		Destination    *simDestination `json:"destination"`
	}
	if err := decodeStrict(w, r, maxEditBody, &body); err != nil || validSimInputs(body.Inputs, body.Destination) != nil {
		badRequest(w)
		return
	}
	if h.Decisions.Dummy || h.Decisions.ML == nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{"SIMULATION_UNAVAILABLE", "The simulator needs the real model; it is not available", ""})
		return
	}

	in := domain.ScoringInput{Referral: domain.ReferralRequest{ReferralID: "simulation", IssuedAt: time.Now()}}
	var base *domain.StoredReferral
	if body.BaseReferralID != "" {
		item, found := domain.StoredReferral{}, false
		if h.Store != nil && idRe.MatchString(body.BaseReferralID) {
			item, found = h.Store.Get(body.BaseReferralID)
		}
		if !found || item.Archived {
			notFound(w)
			return
		}
		base = &item
		in.Referral = item.Request
		in.Referral.ReferralID, in.Referral.IssuedAt = "simulation", time.Now()
		if f := item.Decision.Features; f != nil { // exactly what the model saw when it scored the real referral
			in.Doctor, in.SisruteAvailable, in.SisruteAgeDays = f.Doctor, f.SisruteAvailable, f.SisruteAgeDays
		}
	}
	applied := applySimInputs(&in, body.Inputs)
	if in.Referral.DiagnosisCode == "" || in.Referral.ReasonCategory == "" && in.Referral.Reason == "" {
		badRequest(w) // without a base referral the model needs at least a diagnosis and a reason
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), editBudget)
	defer cancel()
	signals, err := h.Decisions.ML.Predict(ctx, in)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, apiError{"SCORING_UNAVAILABLE", "Scoring service unavailable; nothing was simulated", ""})
		return
	}
	engine := h.Decisions.Engine
	engine.RandomAuditPermille = 0 // a simulation is never drawn for audit
	d := engine.Decide("simulation", signals)

	out := map[string]any{
		"simulated": true, "notice": simNotice, "applied_inputs": applied,
		"model": map[string]any{
			"score": d.Score, "category": d.Decision, "yellow_from": d.YellowFrom, "red_from": d.RedFrom,
			"model_version": d.ModelVersion, "breakdown": d.Breakdown, "reasons": d.Reasons,
		},
	}
	if base != nil {
		b := base.Decision
		out["baseline"] = map[string]any{"score": b.Score, "category": b.Decision, "model_version": b.ModelVersion, "same_model_version": b.ModelVersion == d.ModelVersion}
		out["delta_score"] = d.Score - b.Score
	}
	if dest := body.Destination; dest != nil || base != nil {
		facility, diagnosis := "", in.Referral.DiagnosisCode
		fit := domain.FitInput{}
		if base != nil {
			facility = base.Request.DestinationFacilityID
		}
		if dest != nil {
			if dest.FacilityID != "" {
				facility = dest.FacilityID
			}
			fit.DistanceKm, fit.Competency, fit.Equipment = dest.DistanceKm, dest.Competency, dest.EquipmentAvailable
			if dest.DistanceKm != nil || dest.Competency != "" || dest.EquipmentAvailable != nil {
				out["not_in_model"] = "Jarak, kompetensi, dan ketersediaan alat adalah asumsi untuk penilaian tujuan; model risiko tidak memakainya, jadi skor di atas tidak berubah karenanya."
			}
		}
		out["destination_fit"] = h.fitWith(facility, diagnosis, fit)
	}
	auditLog(r, "simulation_run", body.BaseReferralID, applied)
	writeJSON(w, http.StatusOK, out)
}

// applySimInputs overwrites the scoring input and returns the names of the fields it changed (never their values).
func applySimInputs(in *domain.ScoringInput, s simInputs) []string {
	applied := []string{}
	set := func(name string, do func()) { do(); applied = append(applied, name) }
	if s.DiagnosisCode != nil {
		set("diagnosis_code", func() { in.Referral.DiagnosisCode = *s.DiagnosisCode })
	}
	if s.ReasonCategory != nil {
		set("reason_category", func() { in.Referral.ReasonCategory = *s.ReasonCategory })
	}
	if s.ClinicalNarrative != nil {
		set("clinical_narrative", func() { in.Referral.ClinicalNarrative = *s.ClinicalNarrative })
	}
	if s.N90 != nil {
		set("n90", func() { in.Doctor.N90 = *s.N90 })
	}
	if s.NS90 != nil {
		set("ns90", func() { in.Doctor.NS90 = s.NS90 })
	}
	if s.N180 != nil {
		set("n180", func() { in.Doctor.N180 = *s.N180 })
	}
	if s.HHI180 != nil {
		set("hhi180", func() { in.Doctor.HHI180 = s.HHI180 })
	}
	if s.ToDominantDest != nil {
		set("to_dominant_dest", func() { in.Doctor.ToDominantDest = *s.ToDominantDest })
	}
	if s.DestIsNearest != nil {
		set("dest_is_nearest", func() { in.Doctor.DestIsNearest = s.DestIsNearest })
	}
	if s.SisruteAvailable != nil {
		set("sisrute_available", func() { in.SisruteAvailable = *s.SisruteAvailable })
	}
	if s.SisruteAgeDays != nil {
		set("sisrute_age_days", func() { in.SisruteAgeDays = *s.SisruteAgeDays })
	}
	return applied
}

func validSimInputs(s simInputs, d *simDestination) error {
	bad := func() error { return errInvalidSim }
	if (s.DiagnosisCode != nil && !diagnosisRe.MatchString(*s.DiagnosisCode)) ||
		(s.ReasonCategory != nil && (*s.ReasonCategory == "" || !reasonCategories[*s.ReasonCategory])) ||
		(s.ClinicalNarrative != nil && text(*s.ClinicalNarrative, maxNarrative, false, true) != nil) ||
		(s.N90 != nil && (*s.N90 < 0 || *s.N90 > 1e6)) || (s.N180 != nil && (*s.N180 < 0 || *s.N180 > 1e6)) ||
		(s.NS90 != nil && !(*s.NS90 >= 0 && *s.NS90 <= 1)) || (s.HHI180 != nil && !(*s.HHI180 >= 0 && *s.HHI180 <= 10000)) ||
		(s.SisruteAgeDays != nil && !(*s.SisruteAgeDays >= 0 && *s.SisruteAgeDays <= 3650)) {
		return bad()
	}
	if d != nil && ((d.DistanceKm != nil && !(*d.DistanceKm >= 0 && *d.DistanceKm <= maxDistanceKm)) ||
		(d.Competency != "" && d.Competency != "sesuai" && d.Competency != "sebagian" && d.Competency != "tidak") ||
		text(d.FacilityID, maxName, false, false) != nil) {
		return bad()
	}
	return nil
}
