package router

import (
	"net/http"

	"github.com/sirujuk/backend-go/internal/handler"
	"github.com/sirujuk/backend-go/internal/middleware"
)

func New(h handler.ReferralHandler, a handler.AuthHandler, token, corsOrigin string) http.Handler {
	api := http.NewServeMux()
	api.HandleFunc("POST /api/v1/referrals/score", h.Score)
	api.HandleFunc("GET /api/v1/referrals", h.List)
	api.HandleFunc("GET /api/v1/referrals/{id}", h.Get)
	api.HandleFunc("PUT /api/v1/referrals/{id}", h.Update)
	api.HandleFunc("POST /api/v1/referrals/{id}/rescore", h.Rescore)
	api.HandleFunc("DELETE /api/v1/referrals/{id}", h.Archive)
	api.HandleFunc("POST /api/v1/referrals/{id}/clarifications", h.Clarify)
	api.HandleFunc("GET /api/v1/stats", h.Stats)
	api.HandleFunc("POST /api/v1/audits", h.Audit)
	api.HandleFunc("POST /api/v1/auth/verify", a.Verify)

	root := http.NewServeMux()
	root.HandleFunc("GET /ready", h.ReadyCheck)
	root.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	// Auth first (shared service token), then the account behind X-Actor must still be active with the same role.
	root.Handle("/", middleware.Auth(token)(middleware.ActiveActor(a.Auth.Users)(api)))
	return middleware.SecureHeaders(middleware.CORS(corsOrigin)(middleware.Logger(root)))
}
