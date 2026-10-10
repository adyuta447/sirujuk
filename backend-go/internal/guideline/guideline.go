// Package guideline answers whether a diagnosis is one of the 144 non-specialist (KNS) diagnoses that FKTP must
// resolve itself (Permenkes 5/2014). The list is data, not code: it is loaded from a file the project owner supplies.
package guideline

import (
	"bufio"
	"os"
	"strings"
)

// Guideline is the loaded KNS list. The zero value knows nothing, and says so.
type Guideline struct{ codes map[string]bool }

// Load reads one entry per line: ICD-10 codes ("J06.9", or a 3-character block like "J06" to cover its sub-codes),
// comma-separated, optionally followed by "|name|group|text". The second form is the ML service's kns144.tsv, so
// both services can read the same file instead of keeping two lists. Blank lines and lines starting with # are ignored.
func Load(path string) (Guideline, error) {
	f, err := os.Open(path)
	if err != nil {
		return Guideline{}, err
	}
	defer f.Close()
	g := Guideline{codes: map[string]bool{}}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		codes, _, _ := strings.Cut(line, "|")
		for _, code := range strings.Split(codes, ",") {
			if code = strings.TrimSpace(code); code != "" {
				g.codes[normalize(code)] = true
			}
		}
	}
	return g, sc.Err()
}

// Known reports whether a list was loaded. Without one, NS(d) must stay NULL instead of being guessed.
func (g Guideline) Known() bool { return len(g.codes) > 0 }

// IsNonSpecialist is true when the code, or its 3-character block, is on the list.
func (g Guideline) IsNonSpecialist(icd string) bool {
	c := normalize(icd)
	return g.codes[c] || (len(c) > 3 && g.codes[c[:3]])
}

func normalize(code string) string { return strings.ToUpper(strings.TrimSpace(code)) }
