package guideline

import (
	_ "embed"
	"strings"
)

//go:embed kns144.tsv
var embeddedTable string

// Embedded is the KNS list compiled into the binary, so Cloud Run needs no file mounted. It is a copy of the ML
// service's table; embedded_test.go fails when they drift apart.
func Embedded() Guideline {
	g, _ := parse(strings.NewReader(embeddedTable)) // a strings.Reader cannot fail
	return g
}
