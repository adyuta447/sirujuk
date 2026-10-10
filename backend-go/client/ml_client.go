package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

type MLClient struct {
	BaseURL string
	HTTP    *http.Client
	IDToken func(context.Context) (string, error) // set when ml-service is a private Cloud Run service
}

func NewMLClient(baseURL string) MLClient {
	return MLClient{BaseURL: strings.TrimRight(baseURL, "/"), HTTP: &http.Client{Timeout: 300 * time.Millisecond}}
}

// mlRequest is the /v1/predict body. Nullable fields stay null when unknown: a made-up default (nearest = true,
// a guessed stratum) would be read by the model as data.
type mlRequest struct {
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

func newMLRequest(in domain.ScoringInput) mlRequest {
	r, d := in.Referral, in.Doctor
	req := mlRequest{
		ReferralID: r.ReferralID, DiagnosisCode: r.DiagnosisCode, Reason: reasonKind(r), ClinicalNarrative: r.ClinicalNarrative, IssuedAt: r.IssuedAt,
		N90: d.N90, NS90: d.NS90, N180: d.N180, HHI180: d.HHI180, ToDominantDest: d.ToDominantDest, DestIsNearest: d.DestIsNearest,
		SisruteAvailable: in.SisruteAvailable, SisruteAgeDays: in.SisruteAgeDays,
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
	body, _ := json.Marshal(newMLRequest(in))
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
		return domain.MLScores{}, fmt.Errorf("ml-service status %d", resp.StatusCode)
	}
	var out domain.MLScores
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return domain.MLScores{}, err
	}
	return out, nil
}

var _ service.MLServiceClient = MLClient{}
