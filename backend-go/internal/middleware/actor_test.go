package middleware

import (
	"net/http/httptest"
	"testing"
)

func TestActorRejectsForgedOrMalformedIdentity(t *testing.T) {
	for _, c := range []struct{ sub, role, wantSub string }{
		{"siti@bpjs.id", "verifikator", "siti@bpjs.id"},
		{"siti@bpjs.id", "root", ""},           // role outside the allow-list
		{"siti\"}{\"x\":1", "verifikator", ""}, // log injection attempt
		{"", "tkmkb", ""},
		{"a b", "tkmkb", ""},
	} {
		r := httptest.NewRequest("GET", "/", nil)
		r.Header.Set("X-Actor", c.sub)
		r.Header.Set("X-Actor-Role", c.role)
		if sub, _ := Actor(r); sub != c.wantSub {
			t.Errorf("Actor(%q,%q) = %q, want %q", c.sub, c.role, sub, c.wantSub)
		}
	}
}
