package repository

type FacilityRepository interface {
	Availability(facilityID string) (available bool, updatedDays int, err error)
}
