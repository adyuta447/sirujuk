package router

import (
	"net/http"

	"github.com/sirujuk/backend-go/internal/handler"
	"github.com/sirujuk/backend-go/internal/middleware"
)

func New(h handler.ReferralHandler, token, corsOrigin string) http.Handler {
	api := http.NewServeMux()
	api.HandleFunc("POST /api/v1/referrals/score", h.Score)
	api.HandleFunc("GET /api/v1/referrals", h.List)
	api.HandleFunc("GET /api/v1/referrals/{id}", h.Get)
	api.HandleFunc("POST /api/v1/audits", h.Audit)

	root := http.NewServeMux()
	root.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	root.Handle("/", middleware.Auth(token)(api))
	return middleware.SecureHeaders(middleware.CORS(corsOrigin)(middleware.Logger(root)))
}
