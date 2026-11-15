package seed

import (
	"hash/fnv"

	"github.com/sirujuk/backend-go/internal/repository"
)

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
