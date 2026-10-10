package guideline

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadMatchesCodeAndBlock(t *testing.T) {
	path := filepath.Join(t.TempDir(), "kns.txt")
	if err := os.WriteFile(path, []byte("# KNS\nJ06.9\n\nk30\nI10\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	g, err := Load(path)
	if err != nil || !g.Known() {
		t.Fatalf("load: %v known=%v", err, g.Known())
	}
	for code, want := range map[string]bool{"J06.9": true, "j06.9": true, "K30": true, "K30.1": true, "I10": true, "I50": false, "J06.0": false} {
		if got := g.IsNonSpecialist(code); got != want {
			t.Errorf("%s: want %v, got %v", code, want, got)
		}
	}
}

func TestZeroValueKnowsNothing(t *testing.T) {
	var g Guideline
	if g.Known() || g.IsNonSpecialist("J06.9") {
		t.Fatal("an unloaded guideline must not claim anything")
	}
}

func TestLoadReadsTheMLServicesTSVFormat(t *testing.T) {
	path := filepath.Join(t.TempDir(), "kns144.tsv")
	data := "B20,B21|HIV tanpa komplikasi|Saraf|keluhan ...\nG43|Migren|Saraf|keluhan ...\n"
	if err := os.WriteFile(path, []byte(data), 0o600); err != nil {
		t.Fatal(err)
	}
	g, err := Load(path)
	if err != nil || !g.IsNonSpecialist("B21") || !g.IsNonSpecialist("G43.1") || g.IsNonSpecialist("Migren") {
		t.Fatalf("tsv format: err=%v", err)
	}
}
