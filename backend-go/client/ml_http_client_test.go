package client

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// the JSON the FastAPI service returns for the same answer fakeML (ml_client_test.go) gives over gRPC
const sameAnswerJSON = `{"nlp_similarity":0,"anomaly_score":0,"fraud_score":0,"score":21.5,"category":"red","yellow_from":0,"red_from":16,
 "reasons":[{"code":"NS_ABOVE_PEER_P95","detail":"","contribution":2}],"indicators":{"ns":{"value":0.9}},"model_version":"v2","diagnosis_version":"d1"}`

type httpFake struct {
	status int
	body   string
	delay  time.Duration
	seen   chan seenRequest
}

type seenRequest struct {
	method, path, contentType, auth string
	body                            []byte
}

func startHTTPFake(t *testing.T, f httpFake) HTTPMLClient {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		if f.seen != nil {
			f.seen <- seenRequest{r.Method, r.URL.Path, r.Header.Get("Content-Type"), r.Header.Get("Authorization"), raw}
		}
		time.Sleep(f.delay)
		if f.status != 0 {
			w.WriteHeader(f.status)
		}
		_, _ = io.WriteString(w, f.body)
	}))
	t.Cleanup(srv.Close)
	c, err := NewHTTPMLClient(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

var parityInput = domain.ScoringInput{
	Referral: domain.ReferralRequest{ReferralID: "r-1", PatientName: "Bambang Sutrisno", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2",
		DiagnosisCode: "I10", ReasonCategory: "clinical", ClinicalNarrative: "RAHASIA-NARASI", IssuedAt: time.Date(2026, 11, 1, 8, 0, 0, 0, time.UTC)},
	Doctor:           domain.DoctorFeatures{N90: 30, N180: 60},
	SisruteAvailable: true, SisruteAgeDays: 4,
}

func TestHTTPAndGRPCReturnTheSameScoresForTheSameInput(t *testing.T) {
	g := startFake(t, fakeML{})
	h := startHTTPFake(t, httpFake{body: sameAnswerJSON})
	g.Timeout, h.Timeout = 2*time.Second, 2*time.Second
	viaGRPC, err := g.Predict(context.Background(), parityInput)
	if err != nil {
		t.Fatal(err)
	}
	viaHTTP, err := h.Predict(context.Background(), parityInput)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(viaGRPC, viaHTTP) {
		t.Fatalf("the transport must not change the answer:\n grpc: %+v\n http: %+v", viaGRPC, viaHTTP)
	}
	if viaHTTP.Score != 21.5 || viaHTTP.Category != "red" || len(viaHTTP.Reasons) != 1 || viaHTTP.ModelVersion != "v2" {
		t.Fatalf("unexpected answer: %+v", viaHTTP)
	}
}

func TestHTTPForwardsTheBreakdownAndCeilingUntouched(t *testing.T) {
	const ind = `{"max_category":"yellow","breakdown":{"intercept":-4.2,"logit":3.1,"items":[{"key":"hhi","label":"HHI","contribution":3,"share_pct":100}]}}`
	c := startHTTPFake(t, httpFake{body: `{"score":70,"category":"yellow","yellow_from":50,"red_from":80,"reasons":[],"indicators":` + ind + `,"model_version":"v3","diagnosis_version":"d"}`})
	c.Timeout = 2 * time.Second
	got, err := c.Predict(context.Background(), parityInput)
	if err != nil {
		t.Fatal(err)
	}
	if string(got.Indicators) != ind || domain.MaxCategory(got.Indicators) != "yellow" {
		t.Fatalf("indicators (breakdown, max_category) must reach the decision engine as sent: %s", got.Indicators)
	}
}

func TestHTTPRequestCarriesOnlyModelInputsAndUnknownsStayNull(t *testing.T) {
	seen := make(chan seenRequest, 1)
	c := startHTTPFake(t, httpFake{body: sameAnswerJSON, seen: seen})
	c.Timeout = 2 * time.Second
	cold := parityInput
	cold.Doctor = domain.DoctorFeatures{} // cold start: nothing known about the doctor
	if _, err := c.Predict(context.Background(), cold); err != nil {
		t.Fatal(err)
	}
	r := <-seen
	if r.method != "POST" || r.path != "/v1/predict" || r.contentType != "application/json" || r.auth != "" {
		t.Fatalf("request line: %+v", r)
	}
	var body map[string]any
	if err := json.Unmarshal(r.body, &body); err != nil {
		t.Fatal(err)
	}
	want := []string{"referral_id", "diagnosis_code", "reason", "clinical_narrative", "issued_at", "stratum", "n90", "ns90", "n180", "hhi180", "to_dominant_dest", "dest_is_nearest", "sisrute_available", "sisrute_age_days"}
	if len(body) != len(want) {
		t.Fatalf("the body must hold exactly the model's inputs, got %v", body)
	}
	for _, k := range want {
		if _, ok := body[k]; !ok {
			t.Errorf("missing %s", k)
		}
	}
	for _, k := range []string{"stratum", "ns90", "hhi180", "dest_is_nearest"} {
		if body[k] != nil {
			t.Errorf("%s must be null when unknown, got %v", k, body[k])
		}
	}
	for _, leak := range []string{"Bambang", "Sutrisno", "patient_name", "d-1", "f-1", "f-2", "doctor_id"} {
		if strings.Contains(string(r.body), leak) {
			t.Errorf("%q must not be sent to the ML service", leak)
		}
	}
	if body["reason"] != "clinical" || body["sisrute_available"] != true {
		t.Fatalf("reason and sisrute: %v", body)
	}
}

func TestHTTPAttachesTheCloudRunIDTokenAndFailsClosedWithoutOne(t *testing.T) {
	seen := make(chan seenRequest, 1)
	c := startHTTPFake(t, httpFake{body: sameAnswerJSON, seen: seen})
	c.Timeout = 2 * time.Second
	c.IDToken = func(context.Context) (string, error) { return "tok-123", nil }
	if _, err := c.Predict(context.Background(), parityInput); err != nil {
		t.Fatal(err)
	}
	if r := <-seen; r.auth != "Bearer tok-123" {
		t.Fatalf("authorization: %q", r.auth)
	}
	c.IDToken = func(context.Context) (string, error) { return "", errors.New("metadata down") }
	if _, err := c.Predict(context.Background(), parityInput); err == nil {
		t.Fatal("without a token the call must fail, not go out unauthenticated")
	}
	select {
	case r := <-seen:
		t.Fatalf("no request may be sent when the token fetch failed: %+v", r)
	default:
	}
}

func TestHTTPFailuresBecomeErrorsAndNeverEchoThePatientText(t *testing.T) {
	leaky := `{"detail":[{"type":"string_too_long","loc":["body","clinical_narrative"],"input":"RAHASIA-NARASI"}]}`
	for name, f := range map[string]httpFake{
		"422 echoing the input": {status: 422, body: leaky}, "500": {status: 500, body: "boom"}, "404": {status: 404, body: "nope"},
		"not json": {body: "<html>gateway</html>"}, "empty": {body: ""}, "truncated": {body: `{"score":1`},
	} {
		c := startHTTPFake(t, f)
		c.Timeout = 2 * time.Second
		_, err := c.Predict(context.Background(), parityInput)
		if err == nil {
			t.Errorf("%s: want an error", name)
			continue
		}
		if strings.Contains(err.Error(), "RAHASIA") || strings.Contains(err.Error(), "clinical_narrative") {
			t.Errorf("%s: the error must not carry the response body: %v", name, err)
		}
	}
}

func TestHTTPAnswerLargerThanTheCapIsRefused(t *testing.T) {
	c := startHTTPFake(t, httpFake{body: `{"score":1,"reasons":[],"indicators":{"x":"` + strings.Repeat("a", maxMLResponse) + `"}}`})
	c.Timeout = 5 * time.Second
	if _, err := c.Predict(context.Background(), parityInput); err == nil {
		t.Fatal("an answer over the cap must not be accepted")
	}
}

func TestHTTPGivesUpAtTheTimeout(t *testing.T) {
	c := startHTTPFake(t, httpFake{body: sameAnswerJSON, delay: 400 * time.Millisecond})
	c.Timeout = 50 * time.Millisecond
	start := time.Now()
	if _, err := c.Predict(context.Background(), parityInput); err == nil || time.Since(start) > 300*time.Millisecond {
		t.Fatalf("want a quick timeout error, got %v after %v", err, time.Since(start))
	}
}

func TestNewHTTPMLClientRejectsABadURL(t *testing.T) {
	for _, u := range []string{"", "localhost:8000", "ftp://x", "http://", "://bad"} {
		if _, err := NewHTTPMLClient(u); err == nil {
			t.Errorf("%q must be refused", u)
		}
	}
	if c, err := NewHTTPMLClient("https://ml.internal.example/"); err != nil || c.BaseURL != "https://ml.internal.example" {
		t.Fatalf("a trailing slash is trimmed: %+v %v", c, err)
	}
}
