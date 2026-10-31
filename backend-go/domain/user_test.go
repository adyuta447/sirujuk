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

// Demo accounts that predate expiries (the four in production Firestore) must stop working without any data change.
func TestDemoAccountWithoutExpiryIsExpired(t *testing.T) {
	now := time.Date(2026, 10, 11, 12, 0, 0, 0, time.UTC)
	for name, c := range map[string]struct {
		u    User
		want bool
	}{
		"demo, no expiry":          {User{Email: "tkmkb@demo.sirujuk.id"}, true},
		"demo, upper case":         {User{Email: "TKMKB@Demo.Sirujuk.ID"}, true},
		"demo, expiry in future":   {User{Email: "tkmkb@demo.sirujuk.id", ExpiresAt: "2026-10-18T00:00:00Z"}, false},
		"demo, expiry in the past": {User{Email: "tkmkb@demo.sirujuk.id", ExpiresAt: "2026-10-01T00:00:00Z"}, true},
		"real account, no expiry":  {User{Email: "siti@bpjs.id"}, false},
		"look alike domain":        {User{Email: "x@notdemo.sirujuk.id.example.com"}, false},
	} {
		if got := c.u.Expired(now); got != c.want {
			t.Errorf("%s: want %v, got %v", name, c.want, got)
		}
	}
}
