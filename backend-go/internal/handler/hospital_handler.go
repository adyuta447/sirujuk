package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/guideline"
)

const maxDistanceKm = 2000

var errInvalidSim = errors.New("invalid simulation input")

// parseDistance reads an optional distance in kilometres. ok is false for a value that is not a number in range.
func parseDistance(raw string) (km *float64, ok bool) {
	if raw == "" {
		return nil, true
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil || !(v >= 0 && v <= maxDistanceKm) {
		return nil, false
	}
	return &v, true
}

// fitFor assesses a destination for a diagnosis from the directory. A destination the directory does not know yields
// "belum_terverifikasi", never a guess.
func (h ReferralHandler) fitFor(destination, diagnosis string, km *float64) domain.DestinationFit {
	return h.fitWith(destination, diagnosis, domain.FitInput{DistanceKm: km})
}

// fitWith is fitFor with assumptions already set in in (the simulator).
func (h ReferralHandler) fitWith(destination, diagnosis string, in domain.FitInput) domain.DestinationFit {
	if h.Hospitals != nil {
		if hosp, ok := h.Hospitals.Find(destination); ok {
			in.Hospital = &hosp
		}
	}
	in.DiagnosisGroup, _ = guideline.SpecialistGroup(diagnosis)
	return domain.AssessDestination(in)
}

// Hospitals: GET /hospitals?kind=&wilayah=
func (h ReferralHandler) HospitalList(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleVerifikator, roleTKMKB, roleDinkes); !ok {
		return
	}
	kind, wilayah := r.URL.Query().Get("kind"), r.URL.Query().Get("wilayah")
	if (kind != "" && kind != "umum" && kind != "khusus" && kind != "klinik_utama") || text(wilayah, 64, false, false) != nil {
		badRequest(w)
		return
	}
	items := []domain.Hospital{}
	if h.Hospitals != nil {
		for _, hosp := range h.Hospitals.List() {
			if (kind == "" || hosp.Kind == kind) && (wilayah == "" || strings.EqualFold(hosp.Wilayah, wilayah)) {
				items = append(items, hosp)
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
}

// DestinationFit: GET /referrals/{id}/destination-fit?distance_km=
func (h ReferralHandler) DestinationFit(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleVerifikator, roleTKMKB); !ok {
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
	km, ok := parseDistance(r.URL.Query().Get("distance_km"))
	if !ok {
		badRequest(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"referral_id": id, "destination_facility_id": item.Request.DestinationFacilityID, "diagnosis_code": item.Request.DiagnosisCode,
		"fit": h.fitFor(item.Request.DestinationFacilityID, item.Request.DiagnosisCode, km),
	})
}
