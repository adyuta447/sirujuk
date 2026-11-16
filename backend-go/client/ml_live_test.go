package client

import (
	"context"
	"encoding/json"
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// TestLiveGRPCAndHTTPAgree compares the two transports against a real ML service. Skipped unless both are given:
//
//	ML_LIVE_GRPC=http://127.0.0.1:8001 ML_LIVE_HTTP=http://127.0.0.1:8002 go test ./client -run Live -v
//
// (start the ML image twice, ML_SERVE=grpc and ML_SERVE=http). It is also how to check a deploy: point the two
// variables at the two modes and expect no difference.
func TestLiveGRPCAndHTTPAgree(t *testing.T) {
	grpcURL, httpURL := os.Getenv("ML_LIVE_GRPC"), os.Getenv("ML_LIVE_HTTP")
	if grpcURL == "" || httpURL == "" {
		t.Skip("set ML_LIVE_GRPC and ML_LIVE_HTTP to compare the transports against a real ML service")
	}
	g, err := NewMLClient(grpcURL)
	if err != nil {
		t.Fatal(err)
	}
	h, err := NewHTTPMLClient(httpURL)
	if err != nil {
		t.Fatal(err)
	}
	g.Timeout, h.Timeout = 10*time.Second, 10*time.Second

	f := func(v float64) *float64 { return &v }
	no := false
	issued := time.Date(2026, 11, 1, 8, 0, 0, 0, time.UTC)
	ref := func(dx, reason, narrative string) domain.ReferralRequest {
		return domain.ReferralRequest{ReferralID: "live", DiagnosisCode: dx, ReasonCategory: reason, ClinicalNarrative: narrative, IssuedAt: issued}
	}
	for name, in := range map[string]domain.ScoringInput{
		"cold start":            {Referral: ref("I10", "clinical", "tekanan darah tinggi sakit kepala tengkuk pusing")},
		"suspicious doctor":     {Referral: ref("J06.9", "equipment", "Pasien dirujuk ke rumah sakit."), Doctor: domain.DoctorFeatures{Stratum: "rural|puskesmas", N90: 40, NS90: f(0.9), N180: 80, HHI180: f(6000), ToDominantDest: true, DestIsNearest: &no}, SisruteAvailable: true, SisruteAgeDays: 1},
		"unmapped diagnosis":    {Referral: ref("K30", "clinical", "nyeri ulu hati"), Doctor: domain.DoctorFeatures{N90: 30, NS90: f(0.1), N180: 60, HHI180: f(900)}},
		"invalid code":          {Referral: ref("ZZZ.99", "clinical", "x")},
		"empty narrative":       {Referral: ref("I21", "clinical", ""), Doctor: domain.DoctorFeatures{N90: 30, NS90: f(0.05), N180: 60, HHI180: f(900)}},
		"sisrute not available": {Referral: ref("I10", "staff", "kurang dokter"), SisruteAvailable: false, SisruteAgeDays: 45},
	} {
		viaGRPC, err := g.Predict(context.Background(), in)
		if err != nil {
			t.Fatalf("%s: grpc: %v", name, err)
		}
		viaHTTP, err := h.Predict(context.Background(), in)
		if err != nil {
			t.Fatalf("%s: http: %v", name, err)
		}
		// The indicators are compared as JSON values: Python's json.dumps and FastAPI space and order the same data differently.
		var ig, ih any
		if json.Unmarshal(viaGRPC.Indicators, &ig) != nil || json.Unmarshal(viaHTTP.Indicators, &ih) != nil || !reflect.DeepEqual(ig, ih) {
			t.Errorf("%s: indicators differ\n grpc: %s\n http: %s", name, viaGRPC.Indicators, viaHTTP.Indicators)
		}
		if string(viaGRPC.Indicators) != string(viaHTTP.Indicators) {
			t.Logf("%s: same indicators, different bytes (whitespace only)", name)
		}
		viaGRPC.Indicators, viaHTTP.Indicators = nil, nil
		if !reflect.DeepEqual(viaGRPC, viaHTTP) {
			t.Errorf("%s: the transports disagree\n grpc: %+v\n http: %+v", name, viaGRPC, viaHTTP)
		}
		t.Logf("%-22s score %.1f %-6s reasons %d model %s", name, viaHTTP.Score, viaHTTP.Category, len(viaHTTP.Reasons), viaHTTP.ModelVersion)
	}
}
