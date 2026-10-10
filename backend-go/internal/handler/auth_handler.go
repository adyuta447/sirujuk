package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"mime"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/internal/service"
)

// LoginLimiter counts events per key inside a window (Redis in production, so it holds across instances).
type LoginLimiter interface {
	Hit(ctx context.Context, key string, window time.Duration) (int64, error)
}

// AuthHandler verifies login credentials for the Next.js server (the only caller holding the service token).
// Limiter nil = no throttling (tests, local runs).
type AuthHandler struct {
	Auth    service.Authenticator
	Limiter LoginLimiter
}

const (
	maxAuthBody  = 2 << 10
	maxPassBytes = 256 // bounds the scrypt work one request can ask for
	// The backend URL is public, so this cannot rely on the Next.js limiter: anyone holding the service token could
	// call /auth/verify directly. Counts every attempt per email; the cost is that an attacker can lock one account
	// for 15 minutes, which is accepted over guessable passwords.
	maxLoginTries = 10
	loginWindow   = 15 * time.Minute
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
	if h.Limiter != nil {
		sum := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(in.Email))))
		n, err := h.Limiter.Hit(ctx, "login:"+hex.EncodeToString(sum[:]), loginWindow)
		switch {
		case err != nil: // fail open: a Redis outage must not lock every verifier out; the Next.js limiter still applies
			log.Printf(`{"event":"login_limiter_error"}`)
		case n > maxLoginTries:
			w.Header().Set("Retry-After", "900")
			writeJSON(w, http.StatusTooManyRequests, apiError{"TOO_MANY_ATTEMPTS", "Too many login attempts", ""})
			return
		}
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
