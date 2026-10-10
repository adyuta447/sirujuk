package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/sirujuk/backend-go/client"
	rc "github.com/sirujuk/backend-go/internal/client"
	"github.com/sirujuk/backend-go/internal/handler"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
	"github.com/sirujuk/backend-go/router"
)

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func main() {
	redis, err := rc.NewRedis(env("REDIS_URL", "redis://localhost:6379/0"))
	if err != nil {
		log.Fatal(err)
	}
	// p80/p95 of the current synthetic-data model; recompute on every model version.
	yellow, _ := strconv.ParseFloat(env("YELLOW_FROM", "7.8"), 64)
	red, _ := strconv.ParseFloat(env("RED_FROM", "45"), 64)

	ml := client.NewMLClient(env("ML_SERVICE_URL", "http://localhost:8000"))
	if os.Getenv("ML_AUTH") == "cloudrun" {
		ml.IDToken = client.CloudRunIDToken(ml.BaseURL)
	}
	decisions := service.DecisionService{
		ML:         ml,
		Engine:     service.DecisionEngine{YellowFrom: yellow, RedFrom: red},
		Cache:      redis,
		Facilities: repository.MockFacilities{},
	}
	token := os.Getenv("API_TOKEN")
	if env("APP_ENV", "development") == "production" && len(token) < 32 {
		log.Fatal("API_TOKEN (>=32 chars) is required in production")
	}
	h := handler.ReferralHandler{Decisions: decisions, Queue: redis, AllowClientContext: os.Getenv("ALLOW_CLIENT_CONTEXT") == "true"}
	port := env("GO_PORT", "8080")
	log.Printf("sirujuk backend listening on :%s", port)
	srv := &http.Server{
		Addr: ":" + port, Handler: router.New(h, token, env("CORS_ORIGIN", "http://localhost:3000")),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second,
		IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10,
	}
	log.Fatal(srv.ListenAndServe())
}
