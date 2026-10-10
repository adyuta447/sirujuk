package guideline

import (
	_ "embed"
	"strings"
)

//go:embed kns144.codes
var embeddedCodes string

// Embedded is the KNS list compiled into the binary, so Cloud Run needs no file mounted. It is a copy of the ML
// service's table (codes only); embedded_test.go fails when they drift apart.
func Embedded() Guideline {
	g := Guideline{codes: map[string]bool{}}
	for _, line := range strings.Split(embeddedCodes, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		for _, code := range strings.Split(line, ",") {
			if code = strings.TrimSpace(code); code != "" {
				g.codes[normalize(code)] = true
			}
		}
	}
	return g
}
