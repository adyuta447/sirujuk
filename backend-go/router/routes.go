package router

import (
	"github.com/sirujuk/backend-go/internal/handler"
	"net/http"
)

func New(h handler.ReferralHandler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/referrals/score", h.Score)
	return mux
}
