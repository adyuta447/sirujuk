package handler

import (
	"testing"

	"github.com/sirujuk/backend-go/domain"
)

func TestStatsFlagsEmergencyShareAndEditLogNamesFieldsOnly(t *testing.T) {
	mk := func(doc string, emergency bool) domain.StoredReferral {
		return domain.StoredReferral{Request: domain.ReferralRequest{DoctorID: doc, IsEmergency: emergency}}
	}
	out := buildStats([]domain.StoredReferral{mk("d-1", true), mk("d-1", true), mk("d-1", false), mk("d-1", false), mk("d-2", false)})
	got := map[string]dokterStat{}
	for _, d := range out.Dokter {
		got[d.DoctorID] = d
	}
	if d := got["d-1"]; d.Darurat != 2 || d.PersenDarurat != 50 {
		t.Fatalf("d-1 emergency share = %d / %v%%, want 2 / 50%%", d.Darurat, d.PersenDarurat)
	}
	if d := got["d-2"]; d.Darurat != 0 || d.PersenDarurat != 0 {
		t.Fatalf("d-2 must have no emergencies: %+v", d)
	}

	a := domain.ReferralRequest{DoctorID: "d-1", Reason: "alat", ClinicalNarrative: "rahasia pasien"}
	b := a
	b.DoctorID, b.ClinicalNarrative = "d-2", "teks lain"
	if f := changedFields(a, b); len(f) != 2 || f[0] != "clinical_narrative" || f[1] != "doctor_id" {
		t.Fatalf("changedFields must return sorted names, never values: %v", f)
	}
}
