package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

// maxMLResponse bounds what is read back: a real answer is a few KB.
const maxMLResponse = 1 << 20

// HTTPMLClient calls the ML service's JSON endpoint (POST /v1/predict). It exists for hosts without end-to-end HTTP/2,
// such as Azure Container Apps Express, where the gRPC client (MLClient) cannot connect. It returns the same
// domain.MLScores as MLClient for the same input; ML_TRANSPORT=http selects it.
type HTTPMLClient struct {
	BaseURL string
	IDToken func(context.Context) (string, error) // set when ml-service is a private Cloud Run service
	Timeout time.Duration
	HTTP    *http.Client
}

// NewHTTPMLClient takes http(s)://host[:port], the same value MLClient takes.
func NewHTTPMLClient(baseURL string) (HTTPMLClient, error) {
	u, err := url.Parse(strings.TrimRight(baseURL, "/"))
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return HTTPMLClient{}, fmt.Errorf("ML_SERVICE_URL %q: want http(s)://host[:port]", baseURL)
	}
	tr := http.DefaultTransport.(*http.Transport).Clone()
	tr.MaxIdleConnsPerHost = 32 // the default of 2 would reconnect on most concurrent scores
	return HTTPMLClient{BaseURL: u.String(), Timeout: 300 * time.Millisecond, HTTP: &http.Client{Transport: tr}}, nil
}

// mlJSONRequest is the /v1/predict body. It carries exactly what the gRPC request carries and nothing else: no
// patient name, no doctor or facility id. Unknown values stay null, because a made-up default (nearest = true, a guessed
// stratum) would be read by the model as data.
type mlJSONRequest struct {
	ReferralID        string    `json:"referral_id"`
	DiagnosisCode     string    `json:"diagnosis_code"`
	Reason            string    `json:"reason"`
	ClinicalNarrative string    `json:"clinical_narrative"`
	IssuedAt          time.Time `json:"issued_at"`
	Stratum           *string   `json:"stratum"`
	N90               int       `json:"n90"`
	NS90              *float64  `json:"ns90"`
	N180              int       `json:"n180"`
	HHI180            *float64  `json:"hhi180"`
	ToDominantDest    bool      `json:"to_dominant_dest"`
	DestIsNearest     *bool     `json:"dest_is_nearest"`
	SisruteAvailable  bool      `json:"sisrute_available"`
	SisruteAgeDays    float64   `json:"sisrute_age_days"`
}

func newMLJSONRequest(in domain.ScoringInput) mlJSONRequest {
	r, d := in.Referral, in.Doctor
	req := mlJSONRequest{
		ReferralID: r.ReferralID, DiagnosisCode: r.DiagnosisCode, Reason: ReasonKind(r), ClinicalNarrative: r.ClinicalNarrative, IssuedAt: r.IssuedAt,
		N90: d.N90, NS90: d.NS90, N180: d.N180, HHI180: d.HHI180, ToDominantDest: d.ToDominantDest, DestIsNearest: d.DestIsNearest,
		SisruteAvailable: in.SisruteAvailable, SisruteAgeDays: in.SisruteAgeDays,
	}
	if d.Stratum != "" {
		req.Stratum = &d.Stratum
	}
	return req
}

func (c HTTPMLClient) Predict(ctx context.Context, in domain.ScoringInput) (domain.MLScores, error) {
	body, err := json.Marshal(newMLJSONRequest(in))
	if err != nil {
		return domain.MLScores{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, c.Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/v1/predict", bytes.NewReader(body))
	if err != nil {
		return domain.MLScores{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.IDToken != nil {
		tok, err := c.IDToken(ctx)
		if err != nil {
			return domain.MLScores{}, err
		}
		req.Header.Set("Authorization", "Bearer "+tok)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return domain.MLScores{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		// The status only: a 422 body repeats the rejected input, which includes the clinical narrative.
		return domain.MLScores{}, fmt.Errorf("ml-service status %d", resp.StatusCode)
	}
	var out domain.MLScores
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxMLResponse)).Decode(&out); err != nil {
		return domain.MLScores{}, fmt.Errorf("ml-service answer unreadable: %w", err)
	}
	return out, nil
}

var _ service.MLServiceClient = HTTPMLClient{}
