package repository

import (
	"strings"

	"github.com/sirujuk/backend-go/domain"
)

// HospitalDirectory is the list of destination hospitals. There is no official register behind it yet: outside
// production it is the demo directory (seed.Hospitals), in production it is empty and every destination reads as
// "not in the directory".
type HospitalDirectory interface {
	Find(idOrName string) (domain.Hospital, bool)
	List() []domain.Hospital
}

type MemoryHospitals []domain.Hospital

func (m MemoryHospitals) Find(idOrName string) (domain.Hospital, bool) {
	for _, h := range m {
		if strings.EqualFold(h.ID, idOrName) || strings.EqualFold(h.Name, idOrName) {
			return h, true
		}
	}
	return domain.Hospital{}, false
}

func (m MemoryHospitals) List() []domain.Hospital { return append([]domain.Hospital(nil), m...) }

var _ HospitalDirectory = MemoryHospitals(nil)
