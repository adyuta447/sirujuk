package seed

import (
	"testing"

	"github.com/sirujuk/backend-go/internal/guideline"
	"github.com/sirujuk/backend-go/internal/repository"
)

func TestSeedRowsAreMarkedSyntheticAndDeterministic(t *testing.T) {
	a, b := repository.NewMemoryStore(), repository.NewMemoryStore()
	Run(a, 120, nil)
	Run(b, 120, nil)
	rows := a.List()
	if len(rows) != 120 || b.Count() != 120 {
		t.Fatalf("want 120 rows, got %d / %d", len(rows), b.Count())
	}
	for _, it := range rows {
		if !it.Synthetic {
			t.Fatalf("every seed row must be marked synthetic: %s", it.Request.ReferralID)
		}
		other, _ := b.Get(it.Request.ReferralID)
		if other.Request.DiagnosisCode != it.Request.DiagnosisCode || other.Request.DoctorID != it.Request.DoctorID {
			t.Fatal("seed must be deterministic")
		}
	}
}

func TestSuspiciousDoctorSendsEverythingToOneHospital(t *testing.T) {
	s := repository.NewMemoryStore()
	Run(s, 400, nil)
	dests, total := map[string]int{}, 0
	for _, it := range s.List() {
		if it.Request.DoctorID == "d-001" {
			dests[it.Request.DestinationFacilityID]++
			total++
		}
	}
	if total == 0 || len(dests) != 1 {
		t.Fatalf("d-001 is the suspicious profile: want one destination, got %v over %d rows", dests, total)
	}
}

func TestSeedIsSkippedWhenDataExists(t *testing.T) {
	s := repository.NewMemoryStore()
	Run(s, 5, nil)
	Run(s, 50, nil)
	if s.Count() != 5 {
		t.Fatalf("a second run must not add to existing data, got %d", s.Count())
	}
}

func TestSuspiciousDoctorHasEnoughStoredHistoryForNSAndHHI(t *testing.T) {
	store := repository.NewMemoryStore()
	Run(store, 500, nil) // the documented demo size (SEED_COUNT=500)
	n := 0
	for _, it := range store.List() {
		if it.Request.DoctorID == "d-001" {
			n++
		}
	}
	if n < 30 { // HHI needs 30 in 180 days, NS 20 in 90; all seed rows are within 90 days
		t.Fatalf("d-001 has %d stored referrals; new referrals from history would never reach the NS/HHI minimums", n)
	}
}

// The feature job counts NS from the stored diagnoses, not from the profile. If the seed's codes disagree with the
// 144-diagnosis list, "ordinary" doctors get an NS above the peer P95 (~0.2) and any new referral of theirs turns red.
func TestSeedDoctorsKeepTheirNS(t *testing.T) {
	kns := guideline.Embedded()
	for _, d := range fallbackKNS {
		if !kns.IsNonSpecialist(d.code) {
			t.Errorf("fallback KNS code %s is not on the 144 list", d.code)
		}
	}
	for _, d := range fallbackSpecialist {
		if kns.IsNonSpecialist(d.code) {
			t.Errorf("fallback specialist code %s is on the 144 list", d.code)
		}
	}
	s := repository.NewMemoryStore()
	Run(s, 400, nil)
	total, nonSpecialist := map[string]int{}, map[string]int{}
	for _, it := range s.List() {
		d := it.Request.DoctorID
		total[d]++
		if kns.IsNonSpecialist(it.Request.DiagnosisCode) {
			nonSpecialist[d]++
		}
	}
	ns := func(d string) float64 { return float64(nonSpecialist[d]) / float64(total[d]) }
	for _, d := range []string{"d-003", "d-004", "d-005", "d-006"} {
		if got := ns(d); got > 0.18 { // peer P95 is about 0.19-0.23
			t.Errorf("%s is an ordinary doctor but stores NS %.2f", d, got)
		}
	}
	if got := ns("d-001"); got < 0.7 {
		t.Errorf("d-001 is the suspicious doctor but stores NS %.2f", got)
	}
	if got := ns("d-002"); got < 0.18 || got > 0.4 {
		t.Errorf("d-002 should sit just above the peers, stored NS %.2f", got)
	}
}
