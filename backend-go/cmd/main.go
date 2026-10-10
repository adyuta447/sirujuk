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
	"github.com/sirujuk/backend-go/internal/seed"
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
	prod := env("APP_ENV", "development") == "production"
	dummy := os.Getenv("DUMMY_SCORING") == "true"
	if prod && dummy {
		log.Fatal("DUMMY_SCORING replaces ML scores with heuristics and is not allowed in production")
	}
	decisions := service.DecisionService{
		ML:         ml,
		Engine:     service.DecisionEngine{YellowFrom: yellow, RedFrom: red},
		Cache:      redis,
		Facilities: repository.MockFacilities{},
		Dummy:      dummy,
	}
	token := os.Getenv("API_TOKEN")
	if prod && len(token) < 32 {
		log.Fatal("API_TOKEN (>=32 chars) is required in production")
	}
	// Demo list/detail/audit store. SEED_COUNT>0 fills it with fake referrals (local demo only; unset = empty).
	store := repository.NewMemoryStore()
	seedCount, _ := strconv.Atoi(os.Getenv("SEED_COUNT"))
	seed.Run(store, seedCount)
	h := handler.ReferralHandler{Decisions: decisions, Queue: redis, Store: store, AllowClientContext: os.Getenv("ALLOW_CLIENT_CONTEXT") == "true"}
	port := env("GO_PORT", "8080")
	log.Printf("sirujuk backend listening on :%s", port)
	srv := &http.Server{
		Addr: ":" + port, Handler: router.New(h, token, env("CORS_ORIGIN", "http://localhost:3000")),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second,
		IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10,
	}
	log.Fatal(srv.ListenAndServe())
}
