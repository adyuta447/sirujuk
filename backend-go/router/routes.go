package router

import (
	"net/http"

	"github.com/sirujuk/backend-go/internal/handler"
	"github.com/sirujuk/backend-go/internal/middleware"
)

func New(h handler.ReferralHandler, a handler.AuthHandler, token, corsOrigin string) http.Handler {
	// tag puts a route on the user activity log (resource, action); routes without one are not logged.
	tag := middleware.ActivityTag
	api := http.NewServeMux()
	api.HandleFunc("POST /api/v1/referrals/score", tag("referral", "create", h.Score))
	api.HandleFunc("GET /api/v1/referrals", tag("referral", "list", h.List))
	api.HandleFunc("GET /api/v1/referrals/{id}", tag("referral", "read", h.Get))
	api.HandleFunc("PUT /api/v1/referrals/{id}", tag("referral", "update", h.Update))
	api.HandleFunc("POST /api/v1/referrals/{id}/rescore", tag("referral", "rescore", h.Rescore))
	api.HandleFunc("DELETE /api/v1/referrals/{id}", tag("referral", "delete", h.Archive))
	api.HandleFunc("POST /api/v1/referrals/{id}/clarifications", tag("clarification", "create", h.Clarify))
	api.HandleFunc("GET /api/v1/stats", h.Stats)
	api.HandleFunc("POST /api/v1/simulate", tag("simulation", "simulate", h.Simulate))
	api.HandleFunc("GET /api/v1/hospitals", h.HospitalList)
	api.HandleFunc("GET /api/v1/referrals/{id}/destination-fit", tag("referral", "read", h.DestinationFit))
	api.HandleFunc("GET /api/v1/config/risk", tag("config", "read", h.RiskConfig))
	api.HandleFunc("PUT /api/v1/config/risk", tag("config", "update", h.UpdateRiskConfig))
	api.HandleFunc("POST /api/v1/audits", tag("audit", "create", h.Audit))
	api.HandleFunc("GET /api/v1/activity", h.ActivityLog) // reading the log is not logged: it would feed itself
	api.HandleFunc("GET /api/v1/labels", h.Labels)
	api.HandleFunc("GET /api/v1/auth/session", a.Session)
	api.HandleFunc("POST /api/v1/auth/verify", tag("session", "login", a.Verify))
	api.HandleFunc("POST /api/v1/auth/logout", tag("session", "logout", a.Logout))
	var apiH http.Handler = api
	if h.ActivitySink != nil {
		apiH = middleware.Activity(h.ActivitySink)(api)
	}

	root := http.NewServeMux()
	root.HandleFunc("GET /ready", h.ReadyCheck)
	root.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
	// Auth first (shared service token), then the session behind X-Actor must not be logged out, and the account must
	// still be active with the same role.
	root.Handle("/", middleware.Auth(token)(middleware.NotRevoked(a.Sessions)(middleware.ActiveActor(a.Auth.Users)(apiH))))
	return middleware.SecureHeaders(middleware.CORS(corsOrigin)(middleware.Logger(root)))
}
