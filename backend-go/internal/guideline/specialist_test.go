package guideline

import (
	"os"
	"strings"
	"testing"
)

func TestSpecialistGroupByLongestPrefix(t *testing.T) {
	for icd, want := range map[string]string{"I21.0": "Kardiovaskular", "i50": "Kardiovaskular", "C50.9": "Onkologi", "H25.1": "Mata", "I63": "Neurologi"} {
		if got, ok := SpecialistGroup(icd); !ok || got != want {
			t.Errorf("%s: got %q %v, want %q", icd, got, ok, want)
		}
	}
	for _, icd := range []string{"J06.9", "K30", "", "ZZZ.99"} { // KNS and unknown codes have no specialist group
		if g, ok := SpecialistGroup(icd); ok {
			t.Errorf("%q must be unknown, got %q", icd, g)
		}
	}
}

func TestEmbeddedSpecialistGroupsMatchTheMLTable(t *testing.T) {
	raw, err := os.ReadFile("../../../ml-service/app/ml/data/specialist.tsv")
	if err != nil {
		t.Skip("ML table not in this checkout")
	}
	n := 0
	for _, line := range strings.Split(string(raw), "\n") {
		f := strings.Split(strings.TrimSpace(line), "|")
		if len(f) < 3 || strings.HasPrefix(f[0], "#") {
			continue
		}
		n++
		if g, ok := SpecialistGroup(f[0]); !ok || g != strings.TrimSpace(f[2]) {
			t.Fatalf("%s: embedded says %q %v, ML table says %q; refresh specialist_groups.tsv", f[0], g, ok, f[2])
		}
	}
	if n != len(specialistGroups) {
		t.Fatalf("embedded has %d codes, ML table has %d; refresh specialist_groups.tsv", len(specialistGroups), n)
	}
}
