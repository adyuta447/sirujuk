package seed

import (
	"encoding/json"
	"strings"

	"github.com/sirujuk/backend-go/domain"
)

// DirectorySource marks hospitals that come from the demo directory in testdata/FKTL.json, not from an official register.
const DirectorySource = "direktori-demo"

// khususGroup maps the kind of a specialist hospital to the specialty group of the ML service's diagnosis table.
var khususGroup = map[string]string{"jantung": "Kardiovaskular", "kanker": "Onkologi", "otak/saraf": "Neurologi", "mata": "Mata"}

// Hospitals reads the demo directory: kind and class come from the file's jenis and tipe, a specialist hospital's
// specialty from its jenis (RS Khusus Jantung -> Kardiovaskular). Nothing here says which specialists or equipment a
// general hospital has: the file does not know, so the assessment reports that as unverified.
func Hospitals() []domain.Hospital {
	data, err := testdataFS.ReadFile("testdata/FKTL.json")
	if err != nil {
		return nil
	}
	var file struct {
		FKTL []struct{ Nama, Jenis, Tipe, Wilayah string } `json:"fktl"`
	}
	if json.Unmarshal(data, &file) != nil {
		return nil
	}
	var out []domain.Hospital
	for _, f := range file.FKTL {
		if f.Nama == "" {
			continue
		}
		h := domain.Hospital{ID: f.Nama, Name: f.Nama, Wilayah: f.Wilayah, Class: f.Tipe, Source: DirectorySource}
		jenis := strings.ToLower(f.Jenis)
		switch {
		case strings.HasPrefix(jenis, "rs khusus"):
			h.Kind = "khusus"
			if g, ok := khususGroup[strings.TrimSpace(strings.TrimPrefix(jenis, "rs khusus"))]; ok {
				h.Specialization = []string{g}
			}
		case strings.HasPrefix(jenis, "rs umum"):
			h.Kind = "umum"
		default:
			h.Kind = "klinik_utama"
			if g, ok := khususGroup[strings.TrimPrefix(strings.ToLower(f.Tipe), "spesialis ")]; ok {
				h.Specialization = []string{g}
			}
		}
		out = append(out, h)
	}
	return out
}
