package domain

import (
	"testing"
	"time"
)

func TestAccountExpiry(t *testing.T) {
	now := time.Date(2026, 10, 11, 12, 0, 0, 0, time.UTC)
	for name, c := range map[string]struct {
		expires string
		want    bool
	}{
		"never":            {"", false},
		"in the future":    {"2026-10-12T00:00:00Z", false},
		"exactly now":      {"2026-10-11T12:00:00Z", true},
		"in the past":      {"2026-10-01T00:00:00Z", true},
		"unreadable value": {"next week", true},
	} {
		if got := (User{ExpiresAt: c.expires}).Expired(now); got != c.want {
			t.Errorf("%s: want %v, got %v", name, c.want, got)
		}
	}
}
