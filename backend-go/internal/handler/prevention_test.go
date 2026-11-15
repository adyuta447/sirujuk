package handler

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/guideline"
)

func prevItem(id, dx, origin, dest, decision string) domain.StoredReferral {
	return domain.StoredReferral{
		Request:  domain.ReferralRequest{ReferralID: id, DiagnosisCode: dx, OriginFacilityID: origin, DestinationFacilityID: dest},
		Decision: domain.RiskDecision{Status: "SCORED", Decision: decision},
	}
}

func prevFixture() []domain.StoredReferral {
	confirmed := prevItem("2", "J00", "A", "X", "red")
	confirmed.Audits = []domain.AuditReview{{Role: roleTKMKB, Outcome: domain.OutcomeInvalid}}
	confirmed.Derive()
	dummy := prevItem("5", "J00", "A", "X", "red")
	dummy.Decision.SignalsSource = "backend-dummy"
	return []domain.StoredReferral{
		prevItem("1", "J00", "A", "X", "yellow"), // FKTP-level diagnosis, flagged
		confirmed,                                // FKTP-level, red, a human ruled tidak-valid
		prevItem("3", "J00", "B", "Y", "green"),  // FKTP-level, not flagged
		prevItem("4", "I21.0", "A", "Y", "red"),  // a specialist diagnosis: not a prevention candidate
		dummy,                                    // not scored by the real model: left out
	}
}

func TestPreventionCountsFactsAndSeparatesConfirmedFromEstimated(t *testing.T) {
	p := buildPrevention(prevFixture(), guideline.Embedded(), nil)
	if p == nil || p.Total != 4 || p.KNSTotal != 3 || p.KNSPercent != 75 || p.KNSFlagged != 2 || p.KNSConfirmedInvalid != 1 {
		t.Fatalf("counts: %+v", p)
	}
	if a := p.ByFKTP[0]; a.ID != "A" || a.Total != 3 || a.Flagged != 3 || a.Red != 2 || a.FlaggedPercent != 100 {
		t.Fatalf("by FKTP: %+v", p.ByFKTP)
	}
	if y := p.ByFKRTL[0]; y.ID != "X" || y.Flagged != 2 || len(p.ByFKRTL) != 2 {
		t.Fatalf("by FKRTL: %+v", p.ByFKRTL)
	}
	if !strings.Contains(p.Basis, "data sintetis") {
		t.Fatalf("the basis must name the synthetic data: %s", p.Basis)
	}
}

func TestNoRupiahFigureWithoutAnAssumptionAndAlwaysAnEstimate(t *testing.T) {
	none := buildPrevention(prevFixture(), guideline.Embedded(), nil).Cost
	if none.Available || none.AmountIDR != 0 || none.Reason == "" || none.Kind != "estimasi" || none.Disclaimer == "" {
		t.Fatalf("with no assumption there is no amount: %+v", none)
	}
	for name, a := range map[string]*CostAssumption{"no cost": {PreventionPercent: 50}, "no percent": {PerPreventedReferralIDR: 1000}, "percent over 100": {PerPreventedReferralIDR: 1000, PreventionPercent: 150}} {
		if buildPrevention(prevFixture(), guideline.Embedded(), a).Cost.Available {
			t.Errorf("%s: an incomplete assumption must produce no amount", name)
		}
	}
	got := buildPrevention(prevFixture(), guideline.Embedded(), &CostAssumption{PerPreventedReferralIDR: 1_000_000, PreventionPercent: 50}).Cost
	if !got.Available || got.PreventedReferrals != 1 || got.AmountIDR != 1_000_000 || got.Kind != "estimasi" || len(got.Assumptions) != 3 || !strings.Contains(got.Disclaimer, "bukan penghematan aktual") {
		t.Fatalf("estimate: %+v", got)
	}
}

func TestPreventionNeedsTheKNSListAndReachesDinkesAsAggregatesOnly(t *testing.T) {
	if buildPrevention(prevFixture(), guideline.Guideline{}, nil) != nil {
		t.Fatal("without the KNS list nobody can say which diagnoses FKTP handles: no block")
	}
	h, store := crudHandler(fixedML{})
	h.Decisions.KNS = guideline.Embedded()
	store.Upsert(domain.ReferralRequest{ReferralID: "p-1", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "J00", Reason: "x"},
		domain.RiskDecision{ReferralID: "p-1", Status: "SCORED", Decision: "yellow"})
	for _, role := range []string{"verifikator", "tkmkb", "dinkes"} {
		w := doAs(role, h.Stats, "GET", "", "")
		var out struct{ Prevention *preventionStats }
		if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil || out.Prevention == nil || out.Prevention.KNSFlagged < 1 {
			t.Fatalf("%s: %d %s", role, w.Code, w.Body)
		}
		if strings.Contains(w.Body.String(), `"patient_name"`) || strings.Contains(w.Body.String(), "RAHASIA") {
			t.Fatalf("stats carry aggregates only: %s", w.Body)
		}
	}
	if w := doAs("dokter", h.Stats, "GET", "", ""); w.Code != 403 {
		t.Fatalf("doctor: want 403, got %d", w.Code)
	}
}
