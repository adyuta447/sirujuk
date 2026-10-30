package main

import (
	"context"
	"encoding/hex"
	"errors"
	"github.com/sirujuk/backend-go/domain"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/sirujuk/backend-go/client"
	rc "github.com/sirujuk/backend-go/internal/client"
	"github.com/sirujuk/backend-go/internal/guideline"
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
	redis = withStreamKey(redis, env("APP_ENV", "development") == "production")
	pingCtx, cancelPing := context.WithTimeout(context.Background(), 2*time.Second)
	if err := redis.Ping(pingCtx); err != nil {
		// Not fatal (scoring still works), but batch features, idempotency, the async queue and the login limiter are
		// all off until it answers. /ready reports it.
		log.Printf(`{"event":"redis_unreachable","effect":"cold-start features, no idempotent replay, no async queue, no shared login limiter"}`)
	}
	cancelPing()

	ml := client.NewMLClient(env("ML_SERVICE_URL", "http://localhost:8000"))
	if os.Getenv("ML_AUTH") == "cloudrun" {
		ml.IDToken = client.CloudRunIDToken(ml.BaseURL)
	}
	prod := env("APP_ENV", "development") == "production"
	dummy := os.Getenv("DUMMY_SCORING") == "true"
	if prod && dummy {
		log.Fatal("DUMMY_SCORING replaces ML scores with heuristics and is not allowed in production")
	}
	// SISRUTE: synthetic outside production; in production empty until official access exists (never faked as solved).
	var facilities repository.FacilityRepository = repository.MockFacilities{}
	if !prod {
		facilities = seed.MockSisrute()
	}
	decisions := service.DecisionService{
		ML:         ml,
		Engine:     service.DecisionEngine{MinRedLayers: minRedLayers()},
		Cache:      redis,
		Facilities: facilities,
		Dummy:      dummy,
	}
	token := os.Getenv("API_TOKEN")
	if prod && len(token) < 32 {
		log.Fatal("API_TOKEN (>=32 chars) is required in production")
	}
	// Demo list/detail/audit store. SEED_COUNT>0 fills it with fake referrals (local demo only; unset = empty).
	store := repository.NewMemoryStore()
	project := os.Getenv("FIRESTORE_PROJECT")
	seedCount, _ := strconv.Atoi(os.Getenv("SEED_COUNT"))
	if seedCount > 0 && (prod || project != "") {
		// Fake patients must not enter the real database; archiving is a soft delete, so cleanup would be manual.
		log.Fatal("SEED_COUNT adds synthetic referrals and is refused in production or with FIRESTORE_PROJECT set; use a separate demo environment")
	}
	// SEED_BPJS_FILE: referrals exported by ml-service/bpjs.py from the BPJS 2025 data sample. Same guard: sample rows
	// must not mix with live referrals, and the data-use agreement does not cover putting them in a shared database.
	bpjsFile := os.Getenv("SEED_BPJS_FILE")
	if bpjsFile != "" && (prod || project != "") {
		log.Fatal("SEED_BPJS_FILE loads BPJS sample referrals and is refused in production or with FIRESTORE_PROJECT set")
	}
	switch {
	case project != "":
		// Scores, audits and clarifications survive restarts. Load before seeding: seeding is skipped when data exists.
		persister := repository.NewFirestoreReferrals(project, client.MetadataAccessToken)
		if err := store.UsePersister(context.Background(), persister); err != nil {
			log.Fatalf("cannot load referrals from Firestore: %v", err)
		}
	case prod:
		log.Fatal("FIRESTORE_PROJECT is required in production: audits and clarifications must not live in memory only")
	default:
		log.Print("FIRESTORE_PROJECT not set: referrals, audits and clarifications are kept in memory and lost on restart")
	}
	kns := loadKNS(os.Getenv("KNS_FILE"))
	// Seed rows keep their synthetic doctor history and SISRUTE state (request.Context), so they are scored without History.
	seedDecisions := decisions
	seedDecisions.Facilities = nil                // seed rows carry their own SISRUTE state in Context; the random mock must not override it
	decisions.History, decisions.KNS = store, kns // later scoring of old referrals uses point-in-time features
	var mlEval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error)
	if !dummy {
		mlEval = seedDecisions.Evaluate // seed rows are scored by the real ML service
	}
	if n, err := seed.RunBPJS(store, bpjsFile, mlEval); err != nil {
		log.Fatalf("SEED_BPJS_FILE: %v", err)
	} else if n > 0 {
		log.Printf("loaded %d referrals from the BPJS data sample (%s)", n, seed.BPJSSource)
	}
	seed.Run(store, seedCount, mlEval, seed.Sources{KNS: os.Getenv("KNS_FILE"), Specialist: os.Getenv("SPECIALIST_FILE")})
	// Login accounts: Firestore in production (add them with cmd/useradd); without FIRESTORE_PROJECT only the
	// accounts in AUTH_USERS exist, which is for local development.
	var users repository.UserRepository = repository.NewMemoryUsers(os.Getenv("AUTH_USERS"))
	if project != "" {
		users = repository.NewFirestoreUsers(project, client.MetadataAccessToken)
	}
	if os.Getenv("DEMO_ACCOUNTS") == "true" {
		if prod {
			log.Fatal("DEMO_ACCOUNTS has a public password and is not allowed in production")
		}
		emails, err := seed.DemoUsers(context.Background(), users)
		if err != nil {
			log.Fatalf("demo accounts: %v", err)
		}
		log.Printf("demo accounts ready (see docs/demo.md): %v", emails)
	}
	ready := func(ctx context.Context) map[string]string {
		return map[string]string{
			"redis":     status(redis.Ping(ctx) == nil),
			"firestore": status(project != ""),
			"kns":       status(kns.Known()),
		}
	}
	h := handler.ReferralHandler{Ready: ready, Decisions: decisions, Queue: redis, Results: redis, Store: store, Users: users, AllowClientContext: os.Getenv("ALLOW_CLIENT_CONTEXT") == "true"}
	auth := handler.AuthHandler{Auth: service.Authenticator{Users: users}, Limiter: redis}
	port := env("GO_PORT", "8080")
	log.Printf("sirujuk backend listening on :%s", port)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go service.RunFeatureJob(ctx, store, redis, kns, 6*time.Hour)
	go redis.Consume(ctx, "go-"+port, func(c context.Context, r domain.ReferralRequest) (domain.RiskDecision, error) {
		d, err := decisions.Evaluate(c, r)
		if err == nil {
			store.Upsert(r, d) // async result becomes visible in list/detail
		}
		return d, err
	})
	srv := &http.Server{
		Addr: ":" + port, Handler: router.New(h, auth, token, env("CORS_ORIGIN", "http://localhost:3000")),
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second,
		IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10,
	}
	go func() {
		<-ctx.Done() // SIGTERM/SIGINT: stop accepting, let in-flight requests finish
		sctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// loadKNS reads the 144-diagnosis list from KNS_FILE (or the ML table mounted by compose). Without a file it uses the
// copy compiled into the binary, so NS(d) also works on Cloud Run.
func loadKNS(path string) guideline.Guideline {
	if path == "" {
		log.Print("KNS_FILE not set: using the embedded KNS list")
		return guideline.Embedded()
	}
	g, err := guideline.Load(path)
	if err != nil {
		log.Fatalf("KNS_FILE: %v", err)
	}
	return g
}

// minRedLayers reads MIN_RED_LAYERS (default 1 = trust the model). 2 is recommended before claims are really held.
func minRedLayers() int {
	n, err := strconv.Atoi(os.Getenv("MIN_RED_LAYERS"))
	if err != nil || n < 1 {
		return 1
	}
	return n
}

func status(ok bool) string {
	if ok {
		return "ok"
	}
	return "down"
}

// withStreamKey encrypts queued referrals with STREAM_ENC_KEY (64 hex chars). Production refuses to run without it.
func withStreamKey(r rc.Redis, prod bool) rc.Redis {
	raw := os.Getenv("STREAM_ENC_KEY")
	if raw == "" {
		if prod {
			log.Fatal("STREAM_ENC_KEY is required in production: queued referrals contain patient data")
		}
		log.Print("STREAM_ENC_KEY not set: queued referrals are stored in plaintext (development only)")
		return r
	}
	key, err := hex.DecodeString(raw)
	if err != nil || len(key) != 32 {
		log.Fatal("STREAM_ENC_KEY must be 64 hex characters (32 bytes); generate with: openssl rand -hex 32")
	}
	return r.WithKey(key)
}
