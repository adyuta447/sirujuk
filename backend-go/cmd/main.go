package main

import (
	"github.com/sirujuk/backend-go/client"
	"github.com/sirujuk/backend-go/internal/handler"
	decisionservice "github.com/sirujuk/backend-go/internal/service"
	"github.com/sirujuk/backend-go/router"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("GO_PORT")
	if port == "" {
		port = "8080"
	}
	decisions := decisionservice.DecisionService{ML: client.MLClient{}}
	h := handler.ReferralHandler{Decisions: decisions}
	log.Printf("sirujuk backend listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router.New(h)))
}
