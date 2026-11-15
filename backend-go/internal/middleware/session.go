package middleware

import (
	"context"
	"log"
	"net/http"
	"regexp"
)

// Sessions answers whether a signed-in session was logged out (Redis in production, shared by all instances).
type Sessions interface {
	Revoked(ctx context.Context, sid string) (bool, error)
}

var sidRe = regexp.MustCompile(`^[A-Za-z0-9-]{16,64}$`)

// Session is the session id the Next.js server sends with a user's request (X-Session), or "" if missing or malformed.
func Session(r *http.Request) string {
	if s := r.Header.Get("X-Session"); sidRe.MatchString(s) {
		return s
	}
	return ""
}

// NotRevoked refuses a user's request (one with X-Actor) whose session id is missing or was logged out, so a stolen
// cookie stops working at logout instead of at its expiry. Service calls pass. A store error fails open with a log
// line: a Redis outage must not sign everyone out, and the account check in ActiveActor still applies.
// nil sessions = no store (local runs without Redis): only the id's presence is checked.
func NotRevoked(sessions Sessions) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("X-Actor") == "" && r.Header.Get("X-Actor-Role") == "" {
				next.ServeHTTP(w, r)
				return
			}
			sid := Session(r)
			if sid == "" {
				deny(w, http.StatusUnauthorized, "SESSION_INVALID")
				return
			}
			if sessions != nil {
				revoked, err := sessions.Revoked(r.Context(), sid)
				switch {
				case err != nil:
					log.Printf(`{"event":"session_store_error"}`)
				case revoked:
					deny(w, http.StatusUnauthorized, "SESSION_REVOKED")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
