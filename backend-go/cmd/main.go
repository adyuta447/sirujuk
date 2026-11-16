package main

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/sirujuk/backend-go/domain"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
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
	redisURL := env("REDIS_URL", "redis://localhost:6379/0")
	// Redis carries the password, login counters and sealed patient data, so production needs TLS on the wire.
	// ALLOW_PLAINTEXT_REDIS is for a Redis on the same private Docker network only (docker-compose.yml).
	if env("APP_ENV", "development") == "production" && !strings.HasPrefix(redisURL, "rediss://") && os.Getenv("ALLOW_PLAINTEXT_REDIS") != "true" {
		log.Fatal("REDIS_URL must be rediss:// (TLS) in production; run infra/gcp/redis-vm.sh to enable TLS on the Redis VM")
	}
	redis, err := rc.NewRedis(redisURL, os.Getenv("REDIS_CA_CERT"))
	if err != nil {
		log.Fatal(err)
	}
	redis = withStreamKey(redis, env("APP_ENV", "development") == "production")
	cache := rc.NewResilient(redis) // Redis with a per-instance memory fallback
	pingCtx, cancelPing := context.WithTimeout(context.Background(), 2*time.Second)
	if err := redis.Ping(pingCtx); err != nil {
		// Not fatal (scoring still works), but batch features, idempotency, the async queue and the login limiter are
		// all off until it answers. /ready reports it.
		log.Printf(`{"event":"redis_unreachable","effect":"running on per-instance memory fallback: features, idempotent replay, queue and login limiter work on this instance only"}`)
	}
	cancelPing()

	ml, err := newML(env("ML_SERVICE_URL", "http://localhost:8000"), env("ML_TRANSPORT", "grpc"), os.Getenv("ML_AUTH") == "cloudrun")
	if err != nil {
		log.Fatal(err)
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
		Cache:      cache,
		Facilities: facilities,
		Dummy:      dummy,
	}
	token := os.Getenv("API_TOKEN")
	if prod && len(token) < 32 {
		log.Fatal("API_TOKEN (>=32 chars) is required in production")
	}
	// The secret token salts the random-audit draw, so nobody can work out from the public code which IDs get sampled.
	decisions.Engine.RandomAuditPermille, decisions.Engine.RandomAuditSalt = randomAuditPermille(), token
	// Demo list/detail/audit store. SEED_COUNT>0 fills it with fake referrals (local demo only; unset = empty).
	store := repository.NewMemoryStore()
	project := os.Getenv("FIRESTORE_PROJECT")
	// National risk cut-offs (GET/PUT /api/v1/config/risk). Never configured = the ML service's own category applies.
	riskLive := &service.LiveConfig{}
	var riskStore repository.RiskConfigRepository = &repository.MemoryRiskConfig{}
	if project != "" {
		riskStore = repository.NewFirestoreRiskConfig(project, client.MetadataAccessToken)
	}
	cfgCtx, cancelCfg := context.WithTimeout(context.Background(), 3*time.Second)
	riskLive.Refresh(cfgCtx, riskStore)
	cancelCfg()
	decisions.Engine.Config = riskLive
	// Destination hospitals: the demo directory outside production; in production empty until an official register exists.
	hospitals := repository.MemoryHospitals{}
	if !prod {
		hospitals = repository.MemoryHospitals(seed.Hospitals())
	}
	dataEncrypted := false
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
		if key := encKey("DATA_ENC_KEY", "referrals in Firestore", prod); key != nil {
			persister = persister.WithKey(key)
			dataEncrypted = true
		}
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
	if (seedCount > 0 || bpjsFile != "") && !seed.WaitForML(mlEval, time.Minute) {
		log.Print("ML service did not answer within a minute: seed rows will carry the dummy score")
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
			"redis":           status(redis.Ping(ctx) == nil),
			"firestore":       status(project != ""),
			"kns":             status(kns.Known()),
			"data_encryption": status(dataEncrypted),
		}
	}
	h := handler.ReferralHandler{Regions: seed.Regions(), Ready: ready, Decisions: decisions, Queue: cache, Results: cache, Store: store, Users: users, Hospitals: hospitals, Cost: costAssumption(), ConfigLive: riskLive, ConfigStore: riskStore, AllowClientContext: os.Getenv("ALLOW_CLIENT_CONTEXT") == "true"}
	// Revocation goes straight to Redis: the per-instance fallback would forget a logout another instance recorded.
	auth := handler.AuthHandler{Auth: service.Authenticator{Users: users}, Limiter: cache, Sessions: redis}
	port := env("GO_PORT", "8080")
	log.Printf("sirujuk backend listening on :%s", port)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go store.Sync(ctx, storeSyncInterval()) // pick up changes made by other instances
	go riskLive.Run(ctx, riskStore, 30*time.Second)
	go service.RunFeatureJob(ctx, store, cache, kns, 6*time.Hour)
	go cache.Consume(ctx, "go-"+port, func(c context.Context, r domain.ReferralRequest) (domain.RiskDecision, error) {
		d, err := decisions.Evaluate(c, r)
		if err == nil {
			_, _ = store.Insert(r, d) // async result becomes visible in list/detail; never overwrites an existing referral
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

// costAssumption reads the owner's assumption behind the cost estimate. Both numbers are needed: with either missing
// or invalid, /stats produces no rupiah figure, because the system holds no real claim-cost data.
func costAssumption() *handler.CostAssumption {
	rawCost, rawPct := os.Getenv("ASSUMED_COST_PER_PREVENTED_REFERRAL_IDR"), os.Getenv("ASSUMED_PREVENTION_PERCENT")
	cost, errCost := strconv.ParseInt(rawCost, 10, 64)
	pct, errPct := strconv.ParseFloat(rawPct, 64)
	if errCost != nil || errPct != nil || cost <= 0 || !(pct > 0 && pct <= 100) {
		if rawCost != "" || rawPct != "" {
			log.Print("cost estimate off: ASSUMED_COST_PER_PREVENTED_REFERRAL_IDR must be > 0 and ASSUMED_PREVENTION_PERCENT in (0,100]")
		}
		return nil
	}
	return &handler.CostAssumption{PerPreventedReferralIDR: cost, PreventionPercent: pct}
}

// newML builds the ML client. ML_TRANSPORT=grpc (the default: Cloud Run, compose) needs HTTP/2 end to end; "http" calls
// POST /v1/predict instead, for hosts without it (Azure Container Apps Express). Both return the same scores.
func newML(baseURL, transport string, cloudRunAuth bool) (service.MLServiceClient, error) {
	switch transport {
	case "grpc":
		c, err := client.NewMLClient(baseURL)
		if err != nil {
			return nil, err
		}
		if cloudRunAuth {
			c.IDToken = client.CloudRunIDToken(c.BaseURL)
		}
		return c, nil
	case "http":
		c, err := client.NewHTTPMLClient(baseURL)
		if err != nil {
			return nil, err
		}
		if cloudRunAuth {
			c.IDToken = client.CloudRunIDToken(c.BaseURL)
		}
		log.Print("ML transport: http (POST /v1/predict)")
		return c, nil
	}
	return nil, fmt.Errorf("ML_TRANSPORT %q: want grpc or http", transport)
}

// minRedLayers reads MIN_RED_LAYERS (default 1 = trust the model). 2 is recommended before claims are really held.
func minRedLayers() int {
	n, err := strconv.Atoi(os.Getenv("MIN_RED_LAYERS"))
	if err != nil || n < 1 {
		return 1
	}
	return n
}

// randomAuditPermille defaults to 30 (3% of green referrals); RANDOM_AUDIT_PERMILLE=0 turns the sample off.
func randomAuditPermille() int {
	n, err := strconv.Atoi(os.Getenv("RANDOM_AUDIT_PERMILLE"))
	if err != nil || n < 0 || n > 1000 {
		return 30
	}
	return n
}

func status(ok bool) string {
	if ok {
		return "ok"
	}
	return "down"
}

// withStreamKey encrypts queued referrals and cached scores with STREAM_ENC_KEY. Production refuses to run without it.
func withStreamKey(r rc.Redis, prod bool) rc.Redis {
	if key := encKey("STREAM_ENC_KEY", "queued referrals and cached scores", prod); key != nil {
		return r.WithKey(key)
	}
	return r
}

// encKey reads a 32-byte key given as 64 hex characters. Unset is fatal in production and nil (plaintext) otherwise;
// malformed is always fatal, because a typo that silently disables encryption is worse than a refusal to start.
func encKey(name, what string, prod bool) []byte {
	raw := os.Getenv(name)
	if raw == "" {
		if prod {
			log.Fatalf("%s is required in production: %s contain patient data", name, what)
		}
		log.Printf("%s not set: %s are stored in plaintext (development only)", name, what)
		return nil
	}
	key, err := hex.DecodeString(raw)
	if err != nil || len(key) != 32 {
		log.Fatalf("%s must be 64 hex characters (32 bytes); generate with: openssl rand -hex 32", name)
	}
	return key
}

// storeSyncInterval reads STORE_SYNC_SECONDS (default 30; 0 turns it off). Each sync reads every referral document,
// which Firestore bills per read, so keep it in the tens of seconds.
func storeSyncInterval() time.Duration {
	n, err := strconv.Atoi(os.Getenv("STORE_SYNC_SECONDS"))
	if err != nil || n < 0 {
		return 30 * time.Second
	}
	return time.Duration(n) * time.Second
}
