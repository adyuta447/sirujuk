package handler

import (
	"net/http"
	"time"

	"github.com/sirujuk/backend-go/client"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/middleware"
)

// Below these, a retrain measures noise rather than the model. ml-service/retrain.py uses the same numbers.
const labelMinRows, labelMinPositive = 200, 30

// labelRow is the exact ML input as scored (same fields as PredictionRequest), plus the human verdict.
type labelRow struct {
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

	Label        *int    `json:"label"` // nil = not decided yet; still used for the capacity cut-offs
	RandomAudit  bool    `json:"random_audit"`
	Decision     string  `json:"decision"`
	Score        float64 `json:"score"`
	ModelVersion string  `json:"model_version"`
	Source       string  `json:"source,omitempty"`
}

type labelsResponse struct {
	Labeled  int `json:"labeled"`
	Positive int `json:"positive"`
	// RandomAudited counts labels from the random green sample: the only ones free of the model's own selection bias.
	RandomAudited int        `json:"random_audited"`
	MinLabeled    int        `json:"min_labeled"`
	MinPositive   int        `json:"min_positive"`
	Ready         bool       `json:"ready"`
	Rows          []labelRow `json:"rows,omitempty"`
}

// Labels: GET /labels. TKMKB gets the progress counts; the rows (narratives included) go only to a service call,
// i.e. the retrain job holding the API token. Seed rows and dummy scores are left out: they are not real evidence.
func (h ReferralHandler) Labels(w http.ResponseWriter, r *http.Request) {
	_, role := middleware.Actor(r)
	if role != "" {
		if _, _, ok := actorIn(w, r, roleTKMKB); !ok {
			return
		}
	}
	var items []domain.StoredReferral
	if h.Store != nil {
		items = h.Store.List()
	}
	out := buildLabels(items)
	if role != "" {
		out.Rows = nil
	}
	writeJSON(w, http.StatusOK, out)
}

func buildLabels(items []domain.StoredReferral) labelsResponse {
	out := labelsResponse{MinLabeled: labelMinRows, MinPositive: labelMinPositive, Rows: []labelRow{}}
	for _, it := range items {
		d, f := it.Decision, it.Decision.Features
		if it.Synthetic || f == nil || d.SignalsSource != "" {
			continue
		}
		q, doc := it.Request, f.Doctor
		row := labelRow{
			ReferralID: q.ReferralID, DiagnosisCode: q.DiagnosisCode, Reason: client.ReasonKind(q), ClinicalNarrative: q.ClinicalNarrative,
			IssuedAt: q.IssuedAt, N90: doc.N90, NS90: doc.NS90, N180: doc.N180, HHI180: doc.HHI180,
			ToDominantDest: doc.ToDominantDest, DestIsNearest: doc.DestIsNearest, SisruteAvailable: f.SisruteAvailable, SisruteAgeDays: f.SisruteAgeDays,
			Label: it.Label(), RandomAudit: d.RandomAudit, Decision: d.Decision, Score: d.Score, ModelVersion: d.ModelVersion, Source: it.Source,
		}
		if doc.Stratum != "" {
			row.Stratum = &doc.Stratum
		}
		if row.Label != nil {
			out.Labeled++
			out.Positive += *row.Label
			if row.RandomAudit {
				out.RandomAudited++
			}
		}
		out.Rows = append(out.Rows, row)
	}
	out.Ready = out.Labeled >= labelMinRows && out.Positive >= labelMinPositive
	return out
}
