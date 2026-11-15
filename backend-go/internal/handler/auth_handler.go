package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"mime"
	"net"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/internal/middleware"
	"github.com/sirujuk/backend-go/internal/service"
)

// LoginLimiter counts events per key inside a window (Redis in production, so it holds across instances).
type LoginLimiter interface {
	Hit(ctx context.Context, key string, window time.Duration) (int64, error)
}

// SessionStore revokes logged-out sessions (Redis in production).
type SessionStore interface {
	middleware.Sessions
	Revoke(ctx context.Context, sid string, ttl time.Duration) error
}

// AuthHandler verifies login credentials for the Next.js server (the only caller holding the service token).
// Limiter nil = no throttling, Sessions nil = logout cannot revoke (tests, local runs).
type AuthHandler struct {
	Auth     service.Authenticator
	Limiter  LoginLimiter
	Sessions SessionStore
}

const (
	maxAuthBody  = 2 << 10
	maxPassBytes = 256 // bounds the scrypt work one request can ask for
	// The backend URL is public, so this cannot rely on the Next.js limiter: anyone holding the service token could
	// call /auth/verify directly. Every attempt counts. With the client's IP (X-Client-IP, sent by the Next.js server
	// only where the platform sets it), a source that guesses is blocked for that account without locking the owner
	// out; per-IP and per-account caps still stop spraying and distributed guessing. Without an IP it falls back to
	// per email, where an attacker can lock one account for 15 minutes.
	maxLoginTries   = 10  // per IP and email, or per email when the IP is unknown
	maxIPTries      = 50  // per IP over all emails (password spraying)
	maxAccountTries = 100 // per email over all IPs (needs >= 10 IPs to reach, and only then can it lock the owner)
	loginWindow     = 15 * time.Minute
	// sessionMaxAge is the longest a session token lives (TTL_DETIK in frontend/lib/auth/session.ts), so a revocation
	// outlasts the token it revokes.
	sessionMaxAge = 8 * time.Hour
)

// Verify answers 200 {email,nama,role}, 401 for any wrong email or password (same body for both), or 503 when the
// account store is unavailable. It never logs the email or password.
func (h AuthHandler) Verify(w http.ResponseWriter, r *http.Request) {
	if mt, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type")); mt != "application/json" {
		writeJSON(w, http.StatusUnsupportedMediaType, apiError{"UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json", ""})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthBody)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := dec.Decode(&in)
	if err == nil && dec.More() {
		err = errors.New("trailing data")
	}
	if err == nil && (text(in.Email, 254, true, false) != nil || in.Password == "" || len(in.Password) > maxPassBytes || !utf8.ValidString(in.Password)) {
		err = errors.New("invalid credentials shape")
	}
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{"INVALID_REQUEST", "Request failed validation", ""})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if h.Limiter != nil && !h.allowLogin(ctx, in.Email, r.Header.Get("X-Client-IP")) {
		w.Header().Set("Retry-After", "900")
		writeJSON(w, http.StatusTooManyRequests, apiError{"TOO_MANY_ATTEMPTS", "Too many login attempts", ""})
		return
	}
	user, ok, err := h.Auth.Verify(ctx, in.Email, in.Password)
	if err != nil {
		log.Printf(`{"event":"auth_store_error"}`)
		writeJSON(w, http.StatusServiceUnavailable, apiError{"AUTH_UNAVAILABLE", "Login service unavailable", ""})
		return
	}
	if !ok {
		writeJSON(w, http.StatusUnauthorized, apiError{"INVALID_CREDENTIALS", "Invalid email or password", ""})
		return
	}
	writeJSON(w, http.StatusOK, struct {
		Email string `json:"email"`
		Nama  string `json:"nama"`
		Role  string `json:"role"`
	}{user.Email, user.Nama, user.Role})
}

// Logout revokes the caller's session id (X-Session), so the cookie stops working on every instance before it expires.
func (h AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleVerifikator, roleTKMKB, roleDinkes, roleDokter); !ok {
		return
	}
	sid := middleware.Session(r)
	if sid == "" {
		badRequest(w)
		return
	}
	if h.Sessions == nil || h.Sessions.Revoke(r.Context(), sid, sessionMaxAge) != nil {
		log.Printf(`{"event":"session_revoke_failed"}`)
		writeJSON(w, http.StatusServiceUnavailable, apiError{"SESSION_STORE_UNAVAILABLE", "Could not revoke the session", ""})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// allowLogin counts this attempt against each limit that applies and reports whether all are still under their cap.
// Keys are hashed, so Redis holds neither emails nor IPs. A limiter error fails open: a Redis outage must not lock
// every verifier out, and the Next.js limiter still applies.
func (h AuthHandler) allowLogin(ctx context.Context, email, clientIP string) bool {
	hash := func(parts ...string) string {
		sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
		return hex.EncodeToString(sum[:])
	}
	type limit struct {
		key string
		max int64
	}
	email = strings.ToLower(strings.TrimSpace(email))
	limits := []limit{{"login:" + hash(email), maxLoginTries}}
	if ip := net.ParseIP(clientIP); ip != nil {
		limits = []limit{{"login:" + hash(ip.String(), email), maxLoginTries}, {"login-ip:" + hash(ip.String()), maxIPTries}, {"login-account:" + hash(email), maxAccountTries}}
	}
	for _, l := range limits {
		n, err := h.Limiter.Hit(ctx, l.key, loginWindow)
		if err != nil {
			log.Printf(`{"event":"login_limiter_error"}`)
			continue
		}
		if n > l.max {
			return false
		}
	}
	return true
}

// Session: GET /api/v1/auth/session. 204 while the signed-in session is live and the account still active with that
// role (the middleware has checked both), 403 without an actor, so the frontend can confirm a session for any role
// without fetching data.
func (h AuthHandler) Session(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := actorIn(w, r, roleDokter, roleDinkes, roleVerifikator, roleTKMKB); ok {
		w.WriteHeader(http.StatusNoContent)
	}
}
