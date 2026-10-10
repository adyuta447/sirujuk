package repository

import "context"

// FacilityRepository reads the SISRUTE snapshot of a faskes (age = days since the faskes last updated).
type FacilityRepository interface {
	Availability(ctx context.Context, facilityID string) (available bool, updatedDays float64, err error)
}

// MockFacilities is the PoC stand-in; production is blocked on official SISRUTE access.
// Unknown facility = not available and stale, so w_f stays low.
type MockFacilities map[string]struct {
	Available bool
	AgeDays   float64
}

func (m MockFacilities) Availability(_ context.Context, id string) (bool, float64, error) {
	f, ok := m[id]
	if !ok {
		return false, 30, nil
	}
	return f.Available, f.AgeDays, nil
}
