package router

import (
	"github.com/sirujuk/backend-go/internal/handler"
	"net/http"
)

func New(h handler.ReferralHandler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/referrals/score", h.Score)
	mux.HandleFunc("GET /api/v1/referrals", h.List)
	mux.HandleFunc("GET /api/v1/referrals/{id}", h.Get)
	mux.HandleFunc("POST /api/v1/audits", h.Audit)
	return cors(mux)
}

// cors allows the Next.js frontend on another origin to call the API.
// Demo setup: allow all origins. Tighten for production.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
