package middleware

import (
	"log"
	"net/http"
	"regexp"
	"time"
)

var actorRe = regexp.MustCompile(`^[A-Za-z0-9._@+-]{1,254}$`)

var knownRoles = map[string]bool{"verifikator": true, "tkmkb": true, "dinkes": true, "dokter": true}

// Actor is the signed-in user the Next.js server says is behind this request (X-Actor, X-Actor-Role), or "" if the
// headers are missing or malformed. It is only as trustworthy as the service token (the Next.js server is the sole
// legitimate sender), so a leaked token lets its holder claim any identity. Callers that authorize on it must treat
// "" as no access, not as everyone.
func Actor(r *http.Request) (sub, role string) {
	sub, role = r.Header.Get("X-Actor"), r.Header.Get("X-Actor-Role")
	if !actorRe.MatchString(sub) || !knownRoles[role] {
		return "", ""
	}
	return sub, role
}

type statusWriter struct {
	http.ResponseWriter
	code int
}

func (w *statusWriter) WriteHeader(c int) { w.code = c; w.ResponseWriter.WriteHeader(c) }

// Logger logs method, path, status, latency and the acting user; never bodies. The path carries the referral id, so a
// GET on /referrals/{id} is the "who opened this patient's record" trail. Requests the token check rejected (401)
// are logged without an actor, because their headers were never authenticated.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &statusWriter{w, http.StatusOK}
		start := time.Now()
		next.ServeHTTP(sw, r)
		var actor, role string
		if sw.code != http.StatusUnauthorized {
			actor, role = Actor(r)
		}
		log.Printf(`{"method":%q,"path":%q,"status":%d,"ms":%d,"correlation_id":%q,"actor":%q,"role":%q}`,
			r.Method, r.URL.Path, sw.code, time.Since(start).Milliseconds(), w.Header().Get("X-Correlation-ID"), actor, role)
	})
}
