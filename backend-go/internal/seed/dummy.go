package seed

import (
	"embed"
	"encoding/json"
)

//go:embed testdata/FKTP.json testdata/FKTL.json testdata/pasien.json
var testdataFS embed.FS

type facilityEntry struct {
	Nama    string `json:"nama"`
	Wilayah string `json:"wilayah"`
}

type patientEntry struct {
	Nama string `json:"nama"`
}

type pasienFile struct {
	Pasien []patientEntry `json:"pasien"`
}

type fktpFile struct {
	FKTP []facilityEntry `json:"fktp"`
}

type fktlFile struct {
	FKTL []facilityEntry `json:"fktl"`
}

func loadFacilities() (origins []string, originWilayah map[string]string, dests []string, patients []string) {
	origins = []string{"fktp-cilincing", "fktp-tambora", "fktp-penjaringan", "klinik-mitra-sehat"}
	dests = []string{"rsud-pasar-rebo", "rsup-cm"}
	originWilayah = map[string]string{}

	if data, err := testdataFS.ReadFile("testdata/FKTP.json"); err == nil {
		var parsed fktpFile
		if json.Unmarshal(data, &parsed) == nil {
			var names []string
			for _, f := range parsed.FKTP {
				if f.Nama == "" {
					continue
				}
				names = append(names, f.Nama)
				originWilayah[f.Nama] = f.Wilayah
			}
			if len(names) > 0 {
				origins = names
			}
		}
	}

	if data, err := testdataFS.ReadFile("testdata/FKTL.json"); err == nil {
		var parsed fktlFile
		if json.Unmarshal(data, &parsed) == nil {
			var names []string
			for _, f := range parsed.FKTL {
				if f.Nama == "" {
					continue
				}
				names = append(names, f.Nama)
			}
			if len(names) > 0 {
				dests = names
			}
		}
	}

	if data, err := testdataFS.ReadFile("testdata/pasien.json"); err == nil {
		var parsed pasienFile
		if json.Unmarshal(data, &parsed) == nil {
			for _, p := range parsed.Pasien {
				if p.Nama == "" {
					continue
				}
				patients = append(patients, p.Nama)
			}
		}
	}

	return origins, originWilayah, dests, patients
}
