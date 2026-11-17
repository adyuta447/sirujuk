// Package guideline answers whether a diagnosis is one of the 144 non-specialist (KNS) diagnoses that FKTP must
// resolve itself (Permenkes 5/2014). The list is data, not code: it is loaded from a file the project owner supplies.
package guideline

import (
	"bufio"
	"io"
	"os"
	"strings"
)

// Guideline is the loaded KNS list. The zero value knows nothing, and says so.
type Guideline struct {
	codes map[string]bool
	text  map[string]string // the clinical text of the diagnosis (4th column), when the source has one
}

// Load reads one entry per line: ICD-10 codes ("J06.9", or a 3-character block like "J06" to cover its sub-codes),
// comma-separated, optionally followed by "|name|group|text". The second form is the ML service's kns144.tsv, so
// both services can read the same file instead of keeping two lists. Blank lines and lines starting with # are ignored.
func Load(path string) (Guideline, error) {
	f, err := os.Open(path)
	if err != nil {
		return Guideline{}, err
	}
	defer f.Close()
	return parse(f)
}

func parse(r io.Reader) (Guideline, error) {
	g := Guideline{codes: map[string]bool{}, text: map[string]string{}}
	sc := bufio.NewScanner(r)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		codes, rest, _ := strings.Cut(line, "|")
		fields := strings.Split(rest, "|")
		for _, code := range strings.Split(codes, ",") {
			if code = strings.TrimSpace(code); code != "" {
				g.codes[normalize(code)] = true
				if _, dup := g.text[normalize(code)]; !dup && len(fields) >= 3 { // a code on two rows: the first wins, as in the ML's resolve()
					g.text[normalize(code)] = strings.TrimSpace(fields[2])
				}
			}
		}
	}
	return g, sc.Err()
}

// Narrative is the reference clinical text of a KNS diagnosis, for what-if simulation. Like IsNonSpecialist, a
// sub-code falls back to its 3-character block; a diagnosis outside the list has none, and none is guessed.
func (g Guideline) Narrative(icd string) (string, bool) {
	c := normalize(icd)
	t, ok := g.text[c]
	if !ok && len(c) > 3 {
		t, ok = g.text[c[:3]]
	}
	return t, ok && t != ""
}

// Known reports whether a list was loaded. Without one, NS(d) must stay NULL instead of being guessed.
func (g Guideline) Known() bool { return len(g.codes) > 0 }

// IsNonSpecialist is true when the code, or its 3-character block, is on the list.
func (g Guideline) IsNonSpecialist(icd string) bool {
	c := normalize(icd)
	return g.codes[c] || (len(c) > 3 && g.codes[c[:3]])
}

func normalize(code string) string { return strings.ToUpper(strings.TrimSpace(code)) }
