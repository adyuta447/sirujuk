package handler

import (
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/domain"
)

// Strict ASCII allow-lists for identifiers; free text is checked rune by rune.
var (
	idRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$`)
	// ICD-10 shape: letter, two digits, optional subcategory (I10, J06.9, E11.65).
	// shortcut: shape only, not the full WHO code list (none is bundled); ZZZ.99 fails, an unused but well-formed code passes.
	diagnosisRe = regexp.MustCompile(`^[A-Za-z][0-9]{2}(\.[0-9A-Za-z]{1,2})?$`)
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
	if (required && strings.TrimSpace(s) == "") || n > max || !utf8.ValidString(s) {
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

// validateEditable checks the fields an edit may change: diagnosis, reason and narrative. Identity (doctor, facilities,
// patient, issue time) cannot change on an edit, so it is not checked again; it was checked when the referral came in
// (seed rows use facility names with spaces, and old referrals are past the issue-time window).
func validateEditable(r domain.ReferralRequest) error {
	if !diagnosisRe.MatchString(r.DiagnosisCode) {
		return errors.New("invalid diagnosis_code")
	}
	if !reasonCategories[r.ReasonCategory] {
		return errors.New("invalid reason_category")
	}
	if err := text(r.Reason, maxReason, true, false); err != nil {
		return errors.New("invalid reason")
	}
	if err := text(r.ClinicalNarrative, maxNarrative, true, true); err != nil {
		return errors.New("invalid clinical_narrative")
	}
	return nil
}

// validate checks a new referral in full.
func validate(r domain.ReferralRequest, allowContext bool) error {
	for _, id := range []string{r.DoctorID, r.OriginFacilityID, r.DestinationFacilityID} {
		if !idRe.MatchString(id) {
			return errors.New("invalid identifier")
		}
	}
	if strings.EqualFold(r.OriginFacilityID, r.DestinationFacilityID) { // "FKTP-001" and "fktp-001" are the same place
		return errors.New("origin equals destination")
	}
	if text(r.OriginFacilityName, maxName, false, false) != nil || text(r.DestinationFacilityName, maxName, false, false) != nil {
		return errors.New("invalid facility name")
	}
	if text(r.PatientName, maxName, false, false) != nil || text(r.OriginWilayah, 64, false, false) != nil {
		return errors.New("invalid patient_name or origin_wilayah")
	}
	if err := validateEditable(r); err != nil {
		return err
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
var auditOutcomes = map[string]bool{domain.OutcomeValid: true, domain.OutcomeInvalid: true, domain.OutcomeClarification: true}

// Roles as set by the trusted Next.js proxy from the signed session (see lib/akses.ts).
const (
	roleVerifikator = "verifikator"
	roleTKMKB       = "tkmkb"
)

var reasonCategories = map[string]bool{"": true, "clinical": true, "equipment": true, "staff": true}

func validateAudit(referralID, reviewer, outcome, note string) error {
	if !idRe.MatchString(referralID) || !auditOutcomes[outcome] ||
		text(reviewer, maxName, true, false) != nil || text(note, 2000, false, true) != nil {
		return errors.New("invalid audit")
	}
	return nil
}
