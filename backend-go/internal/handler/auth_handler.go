package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"mime"
	"net/http"
	"time"
	"unicode/utf8"

	"github.com/sirujuk/backend-go/internal/service"
)

// AuthHandler verifies login credentials for the Next.js server (the only caller holding the service token).
type AuthHandler struct{ Auth service.Authenticator }

const (
	maxAuthBody  = 2 << 10
	maxPassBytes = 256 // bounds the scrypt work one request can ask for
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
