package client

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/gen/mlv1"
	"github.com/sirujuk/backend-go/internal/service"
)

// MLClient calls the ML service over gRPC (proto/sirujuk/ml/v1). One HTTP/2 connection is dialled lazily and reused
// by every score; Cloud Run's front end spreads the calls across ML instances.
type MLClient struct {
	BaseURL string
	IDToken func(context.Context) (string, error) // set when ml-service is a private Cloud Run service
	Timeout time.Duration
	rpc     mlv1.InferenceClient
}

// NewMLClient takes the service URL: https:// (Cloud Run) is TLS, on 443 unless a port is given; http://host:port
// (compose, local) is plaintext.
func NewMLClient(baseURL string) (MLClient, error) {
	u, err := url.Parse(strings.TrimRight(baseURL, "/"))
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return MLClient{}, fmt.Errorf("ML_SERVICE_URL %q: want http(s)://host[:port]", baseURL)
	}
	target, creds := u.Host, insecure.NewCredentials()
	if u.Scheme == "https" {
		creds = credentials.NewTLS(&tls.Config{MinVersion: tls.VersionTLS12})
		if u.Port() == "" {
			target += ":443"
		}
	}
	conn, err := grpc.NewClient(target, grpc.WithTransportCredentials(creds))
	if err != nil {
		return MLClient{}, err
	}
	return MLClient{BaseURL: u.String(), Timeout: 300 * time.Millisecond, rpc: mlv1.NewInferenceClient(conn)}, nil
}

// newPredictRequest leaves unknown values unset: a made-up default (nearest = true, a guessed stratum) would be read
// by the model as data.
func newPredictRequest(in domain.ScoringInput) *mlv1.PredictRequest {
	r, d := in.Referral, in.Doctor
	req := &mlv1.PredictRequest{
		ReferralId: r.ReferralID, DiagnosisCode: r.DiagnosisCode, Reason: reasonKind(r), ClinicalNarrative: r.ClinicalNarrative,
		IssuedAt: timestamppb.New(r.IssuedAt), N90: int64(d.N90), Ns90: d.NS90, N180: int64(d.N180), Hhi180: d.HHI180,
		ToDominantDest: d.ToDominantDest, DestIsNearest: d.DestIsNearest,
		SisruteAvailable: &in.SisruteAvailable, SisruteAgeDays: in.SisruteAgeDays,
	}
	if d.Stratum != "" {
		req.Stratum = &d.Stratum
	}
	return req
}

// reasonKind returns the chosen reason category. shortcut: without one, the free text is matched by keyword
// ("alat", "sdm"...), which misreads phrases like "atas saran dokter spesialis"; remove once every client sends it.
func reasonKind(q domain.ReferralRequest) string {
	if q.ReasonCategory != "" {
		return q.ReasonCategory
	}
	r := strings.ToLower(q.Reason)
	switch {
	case strings.Contains(r, "alat"):
		return "equipment"
	case strings.Contains(r, "sdm"), strings.Contains(r, "dokter"), strings.Contains(r, "tenaga"):
		return "staff"
	}
	return "clinical"
}

func (c MLClient) Predict(ctx context.Context, in domain.ScoringInput) (domain.MLScores, error) {
	if c.IDToken != nil {
		tok, err := c.IDToken(ctx)
		if err != nil {
			return domain.MLScores{}, err
		}
		ctx = metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+tok)
	}
	ctx, cancel := context.WithTimeout(ctx, c.Timeout)
	defer cancel()
	r, err := c.rpc.Predict(ctx, newPredictRequest(in))
	if err != nil {
		return domain.MLScores{}, err
	}
	out := domain.MLScores{
		NLPSimilarity: r.NlpSimilarity, AnomalyScore: r.AnomalyScore, FraudScore: r.FraudScore, Score: r.Score,
		Category: r.Category, YellowFrom: r.YellowFrom, RedFrom: r.RedFrom, Indicators: json.RawMessage(r.IndicatorsJson),
		DiagnosisVersion: r.DiagnosisVersion, ModelVersion: r.ModelVersion, Reasons: make([]domain.Reason, len(r.Reasons)),
	}
	for i, x := range r.Reasons {
		out.Reasons[i] = domain.Reason{Code: x.Code, Detail: x.Detail, Contribution: x.Contribution}
	}
	return out, nil
}

var _ service.MLServiceClient = MLClient{}
