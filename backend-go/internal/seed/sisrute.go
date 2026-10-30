package seed

import (
	"hash/fnv"

	"github.com/sirujuk/backend-go/internal/repository"
)

// MockSisrute is the PoC stand-in for SISRUTE, built from the FKTP list in testdata: about 40% of facilities
// report their equipment as available, with a data age of 0-59 days. It is deterministic and synthetic. Production is
// blocked on official access and on Pusdatin confirming the endpoint, so main never uses this in production.
func MockSisrute() repository.MockFacilities {
	origins, _, _, _ := loadFacilities()
	m := make(repository.MockFacilities, len(origins))
	for _, name := range origins {
		h := fnv.New32a()
		h.Write([]byte(name))
		v := h.Sum32()
		m[name] = struct {
			Available bool
			AgeDays   float64
		}{Available: v%10 < 4, AgeDays: float64(v / 10 % 60)}
	}
	return m
}

// Regions returns the region of a facility from the FKTP directory shipped with the demo data. It is a stand-in for
// an official facility register (Kemenkes), which production still needs.
func Regions() func(facilityID string) string {
	_, regions, _, _ := loadFacilities()
	return func(id string) string { return regions[id] }
}
