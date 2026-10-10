package middleware

import (
	"crypto/subtle"
	"net/http"
)

// Auth checks a shared bearer token. shortcut: PoC service token only; replace with mTLS + OAuth2 scopes/RBAC before any real data.
func Auth(token string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		if token == "" {
			return next
		}
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+token)) != 1 {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"invalid credentials"}`, http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
