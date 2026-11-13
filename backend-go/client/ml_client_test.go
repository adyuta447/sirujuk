package client

import (
	"context"
	"errors"
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
	fail  error
}

func (f fakeML) Predict(ctx context.Context, r *mlv1.PredictRequest) (*mlv1.PredictResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	if a := md.Get("authorization"); len(a) > 0 {
		f.auth <- a[0]
	}
	time.Sleep(f.delay)
	if f.fail != nil {
		return nil, f.fail
	}
	return &mlv1.PredictResponse{Score: 21.5, Category: "red", RedFrom: 16, DiagnosisVersion: "d1", IndicatorsJson: []byte(`{"ns":{"value":0.9}}`),
		Reasons: []*mlv1.Reason{{Code: "NS_ABOVE_PEER_P95", Contribution: 2}}, ModelVersion: "v2"}, nil
}

func startFake(t *testing.T, f fakeML) MLClient {
	t.Helper()
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
	return c
}

func TestPredictForwardsTheModelAnswerUntouched(t *testing.T) {
	got, err := startFake(t, fakeML{auth: make(chan string, 1)}).Predict(context.Background(), domain.ScoringInput{})
	if err != nil {
		t.Fatal(err)
	}
	if got.Category != "red" || got.RedFrom != 16 || got.DiagnosisVersion != "d1" || string(got.Indicators) != `{"ns":{"value":0.9}}` ||
		len(got.Reasons) != 1 || got.Reasons[0].Code != "NS_ABOVE_PEER_P95" || got.Reasons[0].Contribution != 2 {
		t.Fatalf("answer changed in transit: %+v", got)
	}
}

func TestPredictTurnsMLFailuresIntoErrors(t *testing.T) {
	for name, fail := range map[string]error{
		"server error": status.Error(codes.Internal, "boom"),
		"bad input":    status.Error(codes.InvalidArgument, "invalid fields: reason"),
	} {
		if _, err := startFake(t, fakeML{auth: make(chan string, 1), fail: fail}).Predict(context.Background(), domain.ScoringInput{}); err == nil {
			t.Errorf("%s: want an error so the referral proceeds and is scored later", name)
		}
	}
}

func TestPredictAttachesTheCloudRunIDToken(t *testing.T) {
	f := fakeML{auth: make(chan string, 1)}
	c := startFake(t, f)
	c.IDToken = func(context.Context) (string, error) { return "tok123", nil }
	if _, err := c.Predict(context.Background(), domain.ScoringInput{}); err != nil {
		t.Fatal(err)
	}
	if a := <-f.auth; a != "Bearer tok123" {
		t.Fatalf("private ML service needs the ID token, got %q", a)
	}
	c.IDToken = func(context.Context) (string, error) { return "", errors.New("no metadata") }
	if _, err := c.Predict(context.Background(), domain.ScoringInput{}); err == nil {
		t.Fatal("a failed token fetch must be an error, not an unauthenticated call")
	}
}

func TestPredictGivesUpAtTimeout(t *testing.T) {
	c := startFake(t, fakeML{auth: make(chan string, 1), delay: 200 * time.Millisecond})
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

func TestReasonCategoryBeatsKeywordGuessing(t *testing.T) {
	if got := reasonKind(domain.ReferralRequest{Reason: "atas saran dokter spesialis", ReasonCategory: "clinical"}); got != "clinical" {
		t.Fatalf("chosen category must win over the keyword fallback, got %q", got)
	}
	if got := reasonKind(domain.ReferralRequest{Reason: "Keterbatasan alat"}); got != "equipment" {
		t.Fatalf("fallback: %q", got)
	}
}
