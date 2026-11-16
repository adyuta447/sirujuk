package main

import (
	"strings"
	"testing"

	"github.com/sirujuk/backend-go/client"
)

func TestNewMLPicksTheTransportAndRefusesAnythingElse(t *testing.T) {
	if c, err := newML("http://ml:8000", "grpc", false); err != nil {
		t.Fatal(err)
	} else if _, ok := c.(client.MLClient); !ok {
		t.Fatalf("grpc: got %T", c)
	}
	if c, err := newML("https://ml.example", "http", false); err != nil {
		t.Fatal(err)
	} else if _, ok := c.(client.HTTPMLClient); !ok {
		t.Fatalf("http: got %T", c)
	}
	for _, transport := range []string{"", "HTTP", "http2", "rest"} {
		if _, err := newML("http://ml:8000", transport, false); err == nil || !strings.Contains(err.Error(), "ML_TRANSPORT") {
			t.Errorf("%q: want a clear error naming ML_TRANSPORT, got %v", transport, err)
		}
	}
	if _, err := newML("ml:8000", "http", false); err == nil {
		t.Fatal("a URL without a scheme must be refused in http mode too")
	}
	if c, err := newML("https://ml.example", "http", true); err != nil || c.(client.HTTPMLClient).IDToken == nil {
		t.Fatalf("ML_AUTH=cloudrun must set the ID token in http mode: %v", err)
	}
	if c, err := newML("https://ml.example", "grpc", true); err != nil || c.(client.MLClient).IDToken == nil {
		t.Fatalf("ML_AUTH=cloudrun must set the ID token in grpc mode: %v", err)
	}
}
