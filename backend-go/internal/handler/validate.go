package handler

import (
	"errors"
	"regexp"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/domain"
)

// Strict ASCII allow-lists for identifiers; free text is checked rune by rune.
var (
	idRe        = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$`)
	diagnosisRe = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9.]{0,9}$`)
	stratumRe   = regexp.MustCompile(`^[a-z]{1,16}\|[a-z]{1,16}$`)
)

const (
	maxName      = 100
	maxReason    = 200
	maxNarrative = 4000
)

// text accepts valid UTF-8 without control, bidi/zero-width (Cf), private-use or unassigned runes.
// Newline and tab are allowed only when multiline is true.
func text(s string, max int, required, multiline bool) error {
	n := utf8.RuneCountInString(s)
	if (required && n == 0) || n > max || !utf8.ValidString(s) {
		return errors.New("bad length or encoding")
	}
	for _, r := range s {
		if multiline && (r == '\n' || r == '\t') {
			continue
		}
		if unicode.IsControl(r) || unicode.Is(unicode.Cf, r) || unicode.Is(unicode.Co, r) || r == unicode.ReplacementChar {
			return errors.New("forbidden character")
		}
	}
	return nil
}

func validate(r domain.ReferralRequest, allowContext bool) error {
	for _, id := range []string{r.DoctorID, r.OriginFacilityID, r.DestinationFacilityID} {
		if !idRe.MatchString(id) {
			return errors.New("invalid identifier")
		}
	}
	if !diagnosisRe.MatchString(r.DiagnosisCode) {
		return errors.New("invalid diagnosis_code")
	}
	if text(r.PatientName, maxName, false, false) != nil || text(r.OriginWilayah, 64, false, false) != nil {
		return errors.New("invalid patient_name or origin_wilayah")
	}
	if err := text(r.Reason, maxReason, true, false); err != nil {
		return errors.New("invalid reason")
	}
	if err := text(r.ClinicalNarrative, maxNarrative, false, true); err != nil {
		return errors.New("invalid clinical_narrative")
	}
	if r.IssuedAt.IsZero() || r.IssuedAt.After(time.Now().Add(5*time.Minute)) || r.IssuedAt.Before(time.Now().AddDate(-1, 0, 0)) {
		return errors.New("invalid issued_at")
	}
	if allowContext {
		c := r.Context
		bad := c.N90 < 0 || c.N180 < 0 || c.N90 > 1e6 || c.N180 > 1e6 || c.SisruteAgeDays < 0 || c.SisruteAgeDays > 3650 ||
			(c.NS90 != nil && (*c.NS90 < 0 || *c.NS90 > 1)) || (c.HHI180 != nil && (*c.HHI180 < 0 || *c.HHI180 > 10000)) ||
			(c.Stratum != "" && !stratumRe.MatchString(c.Stratum))
		if bad {
			return errors.New("invalid context")
		}
	}
	return nil
}

// auditOutcomes mirrors the UI's Keputusan type.
var auditOutcomes = map[string]bool{"valid": true, "tidak-valid": true, "perlu-klarifikasi": true}

func validateAudit(referralID, reviewer, outcome, note string) error {
	if !idRe.MatchString(referralID) || !auditOutcomes[outcome] ||
		text(reviewer, maxName, true, false) != nil || text(note, 2000, false, true) != nil {
		return errors.New("invalid audit")
	}
	return nil
}
