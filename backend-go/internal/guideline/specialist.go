package guideline

import (
	_ "embed"
	"regexp"
	"strings"
)

//go:embed specialist_groups.tsv
var specialistTable string

var nonAlnum = regexp.MustCompile(`[^A-Z0-9]`)

// specialistGroups maps an ICD-10 prefix to the specialty group of the ML service's specialist-diagnosis table.
var specialistGroups = func() map[string]string {
	m := map[string]string{}
	for _, line := range strings.Split(specialistTable, "\n") {
		code, group, ok := strings.Cut(strings.TrimSpace(line), "|")
		if ok && !strings.HasPrefix(code, "#") && code != "" {
			m[nonAlnum.ReplaceAllString(strings.ToUpper(code), "")] = strings.TrimSpace(group)
		}
	}
	return m
}()

// SpecialistGroup is the specialty a diagnosis belongs to (for example "Kardiovaskular"), found by the longest ICD-10
// prefix, as the ML service does. ok is false for a diagnosis outside the table: the table is a draft of 34 entries,
// so most codes are not in it and callers must treat that as "unknown", never as "no specialty needed".
func SpecialistGroup(icd string) (group string, ok bool) {
	c := nonAlnum.ReplaceAllString(strings.ToUpper(icd), "")
	best := ""
	for p := range specialistGroups {
		if strings.HasPrefix(c, p) && len(p) > len(best) {
			best = p
		}
	}
	if best == "" {
		return "", false
	}
	return specialistGroups[best], true
}
