package domain

import (
	"strings"
	"time"
)

// DemoDomain is reserved for demo accounts. Their password is published or printed once, so an account here must
// carry an expiry; one without it counts as expired, even if it was created before expiries existed.
const DemoDomain = "@demo.sirujuk.id"

// User is a login account. Hash is "scrypt:<salt hex>:<key hex>" and never leaves the backend.
type User struct {
	Email string `json:"email"`
	Nama  string `json:"nama"`
	Role  string `json:"role"`
	// DoctorID links a dokter account to the doctor_id on referrals, so a doctor sees and answers only their own.
	DoctorID string `json:"doctor_id,omitempty"`
	// Disabled blocks login and every later request, even inside an existing session.
	Disabled bool `json:"disabled,omitempty"`
	// ExpiresAt (RFC 3339) makes the account stop working by itself. Demo accounts get one so a published password
	// cannot outlive the demo. Empty = never expires. An unreadable value counts as expired (fail closed).
	ExpiresAt string `json:"expires_at,omitempty"`
	Hash      string `json:"hash,omitempty"`
}

// Expired reports whether the account is past its expiry. A malformed ExpiresAt is treated as expired, and so is a
// missing one on a demo account.
func (u User) Expired(now time.Time) bool {
	if u.ExpiresAt == "" {
		return strings.HasSuffix(strings.ToLower(u.Email), DemoDomain)
	}
	t, err := time.Parse(time.RFC3339, u.ExpiresAt)
	return err != nil || !now.Before(t)
}
