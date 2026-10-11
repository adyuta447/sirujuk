package client

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirujuk/backend-go/domain"
)

func TestUnknownValuesAreSentAsNullNotGuessed(t *testing.T) {
	b, _ := json.Marshal(newMLRequest(domain.ScoringInput{Referral: domain.ReferralRequest{ReferralID: "r", DiagnosisCode: "I10", Reason: "x"}}))
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	if v, present := m["dest_is_nearest"]; !present || v != nil {
		t.Fatalf("dest_is_nearest must be null: %v", v)
	}
	if v, present := m["stratum"]; !present || v != nil {
		t.Fatalf("stratum must be null, not a made-up default: %v", v)
	}
}

func mlServer(t *testing.T, status int, body string, seen *http.Request, seenBody *[]byte) MLClient {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if seen != nil {
			*seen = *r
		}
		if seenBody != nil {
			*seenBody, _ = io.ReadAll(r.Body)
		}
		w.WriteHeader(status)
		w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return MLClient{BaseURL: srv.URL, HTTP: srv.Client()}
}

func TestPredictForwardsTheModelAnswerUntouched(t *testing.T) {
	var sent []byte
	c := mlServer(t, 200, `{"score":21.5,"category":"red","yellow_from":2.5,"red_from":16,"model_version":"v2","diagnosis_version":"d1",
		"reasons":[{"code":"NS_ABOVE_PEER_P95","detail":"x","contribution":2}],"indicators":{"ns":{"value":0.9}}}`, nil, &sent)
	got, err := c.Predict(context.Background(), domain.ScoringInput{Referral: domain.ReferralRequest{ReferralID: "r", DiagnosisCode: "I10", Reason: "x"}})
	if err != nil {
		t.Fatal(err)
	}
	if got.Category != "red" || got.RedFrom != 16 || got.DiagnosisVersion != "d1" || len(got.Reasons) != 1 || string(got.Indicators) != `{"ns":{"value":0.9}}` {
		t.Fatalf("answer changed in transit: %+v", got)
	}
	if !strings.Contains(string(sent), `"dest_is_nearest":null`) {
		t.Fatalf("unknown nearest must be sent as null: %s", sent)
	}
}

func TestPredictTurnsMLFailuresIntoErrors(t *testing.T) {
	for name, c := range map[string]MLClient{
		"server error": mlServer(t, 500, "boom", nil, nil),
		"bad input":    mlServer(t, 422, `{"detail":"x"}`, nil, nil),
		"not json":     mlServer(t, 200, "<html>", nil, nil),
	} {
		if _, err := c.Predict(context.Background(), domain.ScoringInput{}); err == nil {
			t.Errorf("%s: want an error so the referral proceeds and is scored later", name)
		}
	}
}

func TestPredictAttachesTheCloudRunIDToken(t *testing.T) {
	var seen http.Request
	c := mlServer(t, 200, `{"category":"green"}`, &seen, nil)
	c.IDToken = func(context.Context) (string, error) { return "tok123", nil }
	if _, err := c.Predict(context.Background(), domain.ScoringInput{}); err != nil {
		t.Fatal(err)
	}
	if seen.Header.Get("Authorization") != "Bearer tok123" {
		t.Fatalf("private ML service needs the ID token, got %q", seen.Header.Get("Authorization"))
	}
	c.IDToken = func(context.Context) (string, error) { return "", errors.New("no metadata") }
	if _, err := c.Predict(context.Background(), domain.ScoringInput{}); err == nil {
		t.Fatal("a failed token fetch must be an error, not an unauthenticated call")
	}
}

func TestReasonCategoryBeatsKeywordGuessing(t *testing.T) {
	if got := reasonKind(domain.ReferralRequest{Reason: "atas saran dokter spesialis", ReasonCategory: "clinical"}); got != "clinical" {
		t.Fatalf("chosen category must win over the keyword fallback, got %q", got)
	}
	if got := reasonKind(domain.ReferralRequest{Reason: "Keterbatasan alat"}); got != "equipment" {
		t.Fatalf("fallback: %q", got)
	}
}
