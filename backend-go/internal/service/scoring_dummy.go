package service

import (
	"strings"

	"github.com/sirujuk/backend-go/domain"
)

// DummyVersion labels every score made without a dataset or ML model.
const DummyVersion = "dummy-heuristic-v0"

// knsDemo is a small subset of the 144 KNS list, enough for dummy tiering.
var knsDemo = map[string]bool{
	"J06.9": true, "K30": true, "I10": true, "M54.5": true, "D50": true,
	"E11": true, "J45": true, "H10.1": true, "L23": true, "M13.9": true,
}

// ScoreDummy builds deterministic signals from request fields only.
// No dataset, no ML call. Same output for same input.
func (ScoringService) ScoreDummy(req domain.ReferralRequest) (domain.MLScores, float64, []string) {
	code := strings.ToUpper(strings.TrimSpace(req.DiagnosisCode))
	knsHit := knsDemo[code]

	reason := strings.ToLower(req.Reason + " " + req.ClinicalNarrative)
	flag := strings.Contains(reason, "alat") || strings.Contains(reason, "sdm") ||
		strings.Contains(reason, "staf") || strings.Contains(reason, "tenaga") ||
		strings.Contains(reason, "rusak") || strings.Contains(reason, "tidak ada")

	words := len(strings.Fields(req.ClinicalNarrative))
	nlp := 0.6
	switch {
	case words < 8:
		nlp = 0.25
	case words < 20:
		nlp = 0.45
	case words < 40:
		nlp = 0.65
	default:
		nlp = 0.85
	}

	jitter := float64(hashSum(req.ReferralID)%10) / 100.0

	anomaly := 0.2 + jitter
	fraud := 0.2 + jitter
	switch {
	case knsHit && flag && words < 20:
		anomaly, fraud = 0.85+jitter, 0.9
	case knsHit && flag:
		anomaly, fraud = 0.7+jitter, 0.75
	case knsHit && words < 20:
		anomaly, fraud = 0.7+jitter, 0.6
	case knsHit:
		anomaly, fraud = 0.5+jitter, 0.45
	case flag:
		anomaly, fraud = 0.4+jitter, 0.4
	}
	if anomaly > 1 {
		anomaly = 0.95
	}
	if fraud > 1 {
		fraud = 0.95
	}

	signals := domain.MLScores{NLPSimilarity: nlp, AnomalyScore: anomaly, FraudScore: fraud}
	score := ClampScore(100 * (0.4*fraud + 0.35*anomaly + 0.25*(1-nlp)))

	var reasons []string
	if knsHit {
		reasons = append(reasons, "Diagnosis "+code+" termasuk keluhan ringan yang umumnya bisa ditangani di FKTP.")
	}
	if flag {
		reasons = append(reasons, "Alasan menyebut keterbatasan alat atau SDM, perlu cek silang ketersediaan faskes asal.")
	}
	if words < 20 {
		reasons = append(reasons, "Catatan klinis terlalu singkat dan belum menjelaskan kebutuhan rujukan spesialis.")
	}
	if len(reasons) == 0 {
		reasons = append(reasons, "Belum ada pola mencurigakan. Rujukan terlihat sesuai prosedur.")
	}
	return signals, score, reasons
}

func hashSum(s string) int {
	total := 0
	for i := 0; i < len(s); i++ {
		total += int(s[i])
	}
	return total
}
