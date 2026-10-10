package seed

import (
	"testing"

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
