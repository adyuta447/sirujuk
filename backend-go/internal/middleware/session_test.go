package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeSessions map[string]bool

func (f fakeSessions) Revoked(_ context.Context, sid string) (bool, error) {
	if sid == "broken-store-0000" {
		return false, errors.New("down")
	}
	return f[sid], nil
}

func TestNotRevokedRefusesLoggedOutAndMissingSessions(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	mw := NotRevoked(fakeSessions{"logged-out-000000": true})(next)
	for name, c := range map[string]struct {
		actor, sid string
		want       int
	}{
		"active session": {"a@x.id", "still-valid-00000", http.StatusNoContent},
		"logged out":     {"a@x.id", "logged-out-000000", http.StatusUnauthorized},
		"no session id":  {"a@x.id", "", http.StatusUnauthorized},
		"malformed id":   {"a@x.id", "bad id!", http.StatusUnauthorized},
		"store down":     {"a@x.id", "broken-store-0000", http.StatusNoContent},
		"service call":   {"", "", http.StatusNoContent},
	} {
		r := httptest.NewRequest("GET", "/", nil)
		if c.actor != "" {
			r.Header.Set("X-Actor", c.actor)
			r.Header.Set("X-Actor-Role", "tkmkb")
		}
		if c.sid != "" {
			r.Header.Set("X-Session", c.sid)
		}
		w := httptest.NewRecorder()
		mw.ServeHTTP(w, r)
		if w.Code != c.want {
			t.Errorf("%s: got %d, want %d", name, w.Code, c.want)
		}
	}
}
