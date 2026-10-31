package client

import (
	"context"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/gen/mlv1"
)

func TestUnknownValuesAreSentAsUnsetNotGuessed(t *testing.T) {
	r := newPredictRequest(domain.ScoringInput{Referral: domain.ReferralRequest{ReferralID: "r", DiagnosisCode: "I10", Reason: "x"}})
	if r.DestIsNearest != nil {
		t.Fatalf("dest_is_nearest must be unset: %v", *r.DestIsNearest)
	}
	if r.Stratum != nil {
		t.Fatalf("stratum must be unset, not a made-up default: %q", *r.Stratum)
	}
}

type fakeML struct {
	mlv1.UnimplementedInferenceServer
	auth  chan string
	delay time.Duration
}

func (f fakeML) Predict(ctx context.Context, r *mlv1.PredictRequest) (*mlv1.PredictResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	f.auth <- md.Get("authorization")[0]
	time.Sleep(f.delay)
	return &mlv1.PredictResponse{Score: 42, Category: "yellow", IndicatorsJson: []byte(`{"ns":{"applies":true}}`),
		Reasons: []*mlv1.Reason{{Code: "NS_ABOVE_PEER_P95", Contribution: 1.5}}, ModelVersion: "v"}, nil
}

func startFake(t *testing.T, f fakeML) MLClient {
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	srv := grpc.NewServer()
	mlv1.RegisterInferenceServer(srv, f)
	go srv.Serve(lis)
	t.Cleanup(srv.Stop)
	c, err := NewMLClient("http://" + lis.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	c.IDToken = func(context.Context) (string, error) { return "tok", nil }
	return c
}

func TestPredictSendsIDTokenAndMapsResponse(t *testing.T) {
	f := fakeML{auth: make(chan string, 1)}
	got, err := startFake(t, f).Predict(context.Background(), domain.ScoringInput{})
	if err != nil {
		t.Fatal(err)
	}
	if a := <-f.auth; a != "Bearer tok" {
		t.Fatalf("authorization = %q", a)
	}
	if got.Score != 42 || got.Category != "yellow" || string(got.Indicators) != `{"ns":{"applies":true}}` ||
		len(got.Reasons) != 1 || got.Reasons[0].Code != "NS_ABOVE_PEER_P95" || got.Reasons[0].Contribution != 1.5 {
		t.Fatalf("mapped wrong: %+v", got)
	}
}

func TestPredictGivesUpAtTimeout(t *testing.T) {
	f := fakeML{auth: make(chan string, 1), delay: 200 * time.Millisecond}
	c := startFake(t, f)
	c.Timeout = 50 * time.Millisecond
	if _, err := c.Predict(context.Background(), domain.ScoringInput{}); status.Code(err) != codes.DeadlineExceeded {
		t.Fatalf("want DeadlineExceeded (caller fails open to async), got %v", err)
	}
}

func TestNewMLClientRejectsURLWithoutScheme(t *testing.T) {
	if _, err := NewMLClient("ml-service:8000"); err == nil {
		t.Fatal("want error")
	}
}
