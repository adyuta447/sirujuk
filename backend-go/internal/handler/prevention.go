package handler

import (
	"fmt"
	"math"
	"sort"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

// CostAssumption is the owner's stated assumption behind a cost estimate. There is no real claim-cost data in the
// system, so without both numbers no rupiah figure is produced at all.
// shortcut: set from the environment, so changing it needs a redeploy; move it next to RiskConfig if the owner wants to edit it in the app.
type CostAssumption struct {
	PerPreventedReferralIDR int64   // assumed average cost difference per referral that is prevented
	PreventionPercent       float64 // assumed share of the flagged FKTP-level referrals that would really be prevented (0-100]
}

type levelStat struct {
	ID             string  `json:"id"`
	Total          int     `json:"total"`
	Flagged        int     `json:"flagged"` // yellow or red
	Red            int     `json:"red"`
	FlaggedPercent float64 `json:"flagged_percent"`
}

type costEstimate struct {
	Available          bool     `json:"available"`
	Kind               string   `json:"kind"` // always "estimasi"
	Reason             string   `json:"reason,omitempty"`
	PreventedReferrals int      `json:"prevented_referrals,omitempty"`
	AmountIDR          int64    `json:"amount_idr,omitempty"`
	Assumptions        []string `json:"assumptions,omitempty"`
	Disclaimer         string   `json:"disclaimer"`
}

// preventionStats counts what the model flagged among referrals FKTP could have handled itself. The counts are facts
// about the model's output; the cost block is an estimate built on stated assumptions and says so.
type preventionStats struct {
	Total               int          `json:"total"`                 // referrals scored by the real model
	KNSTotal            int          `json:"kns_total"`             // diagnosis is one of the 144 FKTP must resolve (Permenkes 5/2014)
	KNSPercent          float64      `json:"kns_percent"`           //
	KNSFlagged          int          `json:"kns_flagged"`           // of those, scored yellow or red: candidates for prevention
	KNSConfirmedInvalid int          `json:"kns_confirmed_invalid"` // of those, a human audit ruled tidak-valid: the only evidence here
	ByFKTP              []levelStat  `json:"by_fktp"`               // origin facility, most flagged first
	ByFKRTL             []levelStat  `json:"by_fkrtl"`              // destination facility, most flagged first
	Cost                costEstimate `json:"cost"`
	Basis               string       `json:"basis"`
}

const (
	preventionBasis = "Kandidat pencegahan adalah rujukan kuning atau merah dengan diagnosis yang menurut Permenkes 5/2014 harus diselesaikan FKTP. Hitungan berasal dari skor model yang dilatih pada data sintetis; hanya 'terkonfirmasi tidak valid' yang didukung audit manusia."
	costDisclaimer  = "Estimasi potensi efisiensi, bukan penghematan aktual: belum ada data biaya klaim riil."
	topLevels       = 10
)

// buildPrevention returns nil when the KNS list is not loaded: without it nobody can say which diagnoses FKTP handles.
func buildPrevention(items []domain.StoredReferral, kns service.KNSList, cost *CostAssumption) *preventionStats {
	if kns == nil || !kns.Known() {
		return nil
	}
	out := &preventionStats{Basis: preventionBasis}
	fktp, fkrtl := map[string]*levelStat{}, map[string]*levelStat{}
	bump := func(m map[string]*levelStat, id string, flagged, red bool) {
		s := m[id]
		if s == nil {
			s = &levelStat{ID: id}
			m[id] = s
		}
		s.Total++
		if flagged {
			s.Flagged++
		}
		if red {
			s.Red++
		}
	}
	for _, it := range items {
		if it.Decision.Status != "SCORED" || it.Decision.SignalsSource == "backend-dummy" {
			continue
		}
		red := it.Decision.Decision == "red"
		flagged := red || it.Decision.Decision == "yellow"
		out.Total++
		bump(fktp, it.Request.OriginFacilityID, flagged, red)
		bump(fkrtl, it.Request.DestinationFacilityID, flagged, red)
		if !kns.IsNonSpecialist(it.Request.DiagnosisCode) {
			continue
		}
		out.KNSTotal++
		if flagged {
			out.KNSFlagged++
		}
		if l := it.Label(); it.Final && l != nil && *l == 1 {
			out.KNSConfirmedInvalid++
		}
	}
	if out.Total > 0 {
		out.KNSPercent = round1(100 * float64(out.KNSTotal) / float64(out.Total))
	}
	out.ByFKTP, out.ByFKRTL = topOf(fktp), topOf(fkrtl)
	out.Cost = estimateCost(out.KNSFlagged, cost)
	return out
}

func estimateCost(candidates int, a *CostAssumption) costEstimate {
	c := costEstimate{Kind: "estimasi", Disclaimer: costDisclaimer}
	if a == nil || a.PerPreventedReferralIDR <= 0 || !(a.PreventionPercent > 0 && a.PreventionPercent <= 100) {
		c.Reason = "Belum ada asumsi biaya dari pemilik sistem (ASSUMED_COST_PER_PREVENTED_REFERRAL_IDR dan ASSUMED_PREVENTION_PERCENT), dan tidak ada data klaim riil."
		return c
	}
	c.Available = true
	c.PreventedReferrals = int(math.Round(float64(candidates) * a.PreventionPercent / 100))
	c.AmountIDR = int64(c.PreventedReferrals) * a.PerPreventedReferralIDR
	c.Assumptions = []string{
		"Rujukan kuning atau merah dengan diagnosis non-spesialistik (KNS) dianggap kandidat untuk dicegah.",
		fmt.Sprintf("Hanya %.0f%% dari kandidat itu yang diasumsikan benar-benar tercegah.", a.PreventionPercent),
		fmt.Sprintf("Selisih biaya rata-rata per rujukan yang tercegah diasumsikan Rp%d.", a.PerPreventedReferralIDR),
	}
	return c
}

func topOf(m map[string]*levelStat) []levelStat {
	out := make([]levelStat, 0, len(m))
	for _, s := range m {
		s.FlaggedPercent = round1(100 * float64(s.Flagged) / float64(s.Total))
		out = append(out, *s)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Flagged != out[j].Flagged {
			return out[i].Flagged > out[j].Flagged
		}
		return out[i].ID < out[j].ID
	})
	if len(out) > topLevels {
		out = out[:topLevels]
	}
	return out
}
