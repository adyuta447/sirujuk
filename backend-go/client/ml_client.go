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

type mlRequest struct {
	ReferralID        string    `json:"referral_id"`
	DiagnosisCode     string    `json:"diagnosis_code"`
	Reason            string    `json:"reason"`
	ClinicalNarrative string    `json:"clinical_narrative"`
	IssuedAt          time.Time `json:"issued_at"`
	domain.DoctorFeatures
	SisruteAvailable bool    `json:"sisrute_available"`
	SisruteAgeDays   float64 `json:"sisrute_age_days"`
}

type mlResponse struct {
	NLPSimilarity float64         `json:"nlp_similarity"`
	AnomalyScore  float64         `json:"anomaly_score"`
	FraudScore    float64         `json:"fraud_score"`
	Score         float64         `json:"score"`
	Reasons       []domain.Reason `json:"reasons"`
	ModelVersion  string          `json:"model_version"`
}

// reasonKind maps the free-text referral reason to the ML enum.
func reasonKind(reason string) string {
	r := strings.ToLower(reason)
	switch {
	case strings.Contains(r, "alat"):
		return "equipment"
	case strings.Contains(r, "sdm"), strings.Contains(r, "dokter"), strings.Contains(r, "tenaga"):
		return "staff"
	}
	return "clinical"
}

func (c MLClient) Predict(ctx context.Context, in domain.ScoringInput) (domain.MLScores, error) {
	r, d := in.Referral, in.Doctor
	if d.Stratum == "" {
		d.Stratum = "urban|puskesmas"
	}
	body, _ := json.Marshal(mlRequest{r.ReferralID, r.DiagnosisCode, reasonKind(r.Reason), r.ClinicalNarrative, r.IssuedAt, d, in.SisruteAvailable, in.SisruteAgeDays})
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
	var out mlResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return domain.MLScores{}, err
	}
	return domain.MLScores{NLPSimilarity: out.NLPSimilarity, AnomalyScore: out.AnomalyScore, FraudScore: out.FraudScore,
		Score: out.Score, Reasons: out.Reasons, ModelVersion: out.ModelVersion}, nil
}

var _ service.MLServiceClient = MLClient{}
