package main

import (
	"github.com/sirujuk/backend-go/client"
	"github.com/sirujuk/backend-go/internal/handler"
	decisionservice "github.com/sirujuk/backend-go/internal/service"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/seed"
	"github.com/sirujuk/backend-go/router"
	"log"
	"net/http"
	"os"
	"strconv"
)

func main() {
	port := os.Getenv("GO_PORT")
	if port == "" {
		port = "8080"
	}
	useML := os.Getenv("ML_ENABLED") == "true"
	seedCount := 50
	if v, err := strconv.Atoi(os.Getenv("SEED_COUNT")); err == nil && v > 0 {
		seedCount = v
	}
	store := repository.NewMemoryStore()
	decisions := decisionservice.DecisionService{ML: client.MLClient{}, UseML: useML, Store: store}
	seed.Run(store, decisionservice.ScoringService{}, decisionservice.DecisionEngine{}, seedCount)
	h := handler.ReferralHandler{Decisions: decisions, Store: store}
	log.Printf("sirujuk backend listening on :%s ml=%v seed=%d stored=%d", port, useML, seedCount, store.Count())
	log.Fatal(http.ListenAndServe(":"+port, router.New(h)))
}
