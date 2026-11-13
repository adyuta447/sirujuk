package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

type failML struct{}

func (failML) Predict(context.Context, domain.ScoringInput) (domain.MLScores, error) {
	return domain.MLScores{}, errors.New("down")
}

const ok = `{"doctor_id":"d-1","origin_facility_id":"f-1","destination_facility_id":"f-2","diagnosis_code":"J06.9","reason":"Keterbatasan alat","clinical_narrative":"batuk\npilek","issued_at":"%s"}`

func call(h ReferralHandler, key, body string) int {
	req := httptest.NewRequest("POST", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if key != "" {
		req.Header.Set("Idempotency-Key", key)
	}
	rec := httptest.NewRecorder()
	h.Score(rec, req)
	return rec.Code
}

func valid(extra string) string {
	b := fmt.Sprintf(ok, time.Now().Format(time.RFC3339))
	return strings.Replace(b, "}", extra+"}", 1)
}

func TestFailOpenAndEmergency(t *testing.T) {
	h := ReferralHandler{Decisions: service.DecisionService{ML: failML{}}}
	if c := call(h, "R1", valid("")); c != http.StatusAccepted {
		t.Fatalf("ML down must be 202, got %d", c)
	}
	if c := call(h, "R2", valid(`,"is_emergency":true`)); c != http.StatusAccepted {
		t.Fatalf("emergency must be 202, got %d", c)
	}
}

func TestRejectsBadInput(t *testing.T) {
	h := ReferralHandler{Decisions: service.DecisionService{ML: failML{}}}
	bad := map[string]struct{ key, body string }{
		"no key":        {"", valid("")},
		"key injection": {"R1\"}\nfake", valid("")},
		"unknown field": {"R1", valid(`,"admin":true`)},
		"bidi override": {"R1", valid(`,"reason":"x\u202Eabc"`)},
		"control char":  {"R1", valid(`,"clinical_narrative":"a\u0000b"`)},
		"bad doctor id": {"R1", valid(`,"doctor_id":"d-1'; DROP"`)},
		"trailing json": {"R1", valid("") + `{}`},
		"too long":      {"R1", valid(`,"clinical_narrative":"` + strings.Repeat("a", 40000) + `"`)},
		"no narrative":  {"R1", valid(`,"clinical_narrative":" \n "`)}, // the model reads blank as "not recorded"
	}
	for name, c := range bad {
		if got := call(h, c.key, c.body); got < 400 || got >= 500 {
			t.Errorf("%s: want 4xx, got %d", name, got)
		}
	}
}
