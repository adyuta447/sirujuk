package seed

import "testing"

func TestDemoDirectoryClassifiesHospitalsFromTheFile(t *testing.T) {
	byName := map[string]struct {
		kind, spec string
	}{}
	for _, h := range Hospitals() {
		spec := ""
		if len(h.Specialization) > 0 {
			spec = h.Specialization[0]
		}
		if h.Source != DirectorySource || h.ID == "" || h.Wilayah == "" {
			t.Errorf("incomplete record: %+v", h)
		}
		byName[h.Name] = struct{ kind, spec string }{h.Kind, spec}
	}
	if len(byName) != 9 {
		t.Fatalf("the demo file lists 9 hospitals, got %d", len(byName))
	}
	for name, want := range map[string]struct{ kind, spec string }{
		"RSUPN Dr. Cipto Mangunkusumo (RSCM)": {"umum", ""}, "RS Harapan Kita": {"khusus", "Kardiovaskular"},
		"RS Kanker Dharmais": {"khusus", "Onkologi"}, "RS Pusat Otak Nasional (RS PON)": {"khusus", "Neurologi"},
	} {
		if got := byName[name]; got != want {
			t.Errorf("%s: got %+v, want %+v", name, got, want)
		}
	}
	eye := 0
	for _, h := range Hospitals() {
		if h.Kind == "klinik_utama" && len(h.Specialization) == 1 && h.Specialization[0] == "Mata" {
			eye++
		}
	}
	if eye != 1 {
		t.Fatalf("exactly one eye clinic is expected, got %d", eye)
	}
}
