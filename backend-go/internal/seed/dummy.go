package seed

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

// Run fills the store with n deterministic dummy referrals.
// Tiering: first 60% green, next 26% yellow, rest red.
func Run(store *repository.MemoryStore, scorer service.ScoringService, engine service.DecisionEngine, n int) {
	if n <= 0 {
		n = 50
	}
	if store.Count() > 0 {
		return
	}
	rng := rand.New(rand.NewSource(42))
	doctors := []string{"d-001", "d-002", "d-003", "d-004", "d-005", "d-006"}
	origins := []string{"fktp-cilincing", "fktp-tambora", "fktp-penjaringan", "klinik-mitra-sehat"}
	dests := []string{"rsud-pasar-rebo", "rsup-cm"}
	greenDx := []string{"I50", "E11.6", "J18", "N18.3"}
	yellowDx := []string{"J06.9", "K30", "D50", "M54.5"}
	redDx := []string{"I10", "K30", "J06.9"}

	for i := 0; i < n; i++ {
		id := fmt.Sprintf("r-%03d", i+1)
		var dx, reason, narrative string
		switch {
		case i < n*60/100:
			dx = greenDx[rng.Intn(len(greenDx))]
			reason = "Rujukan spesialis sesuai indikasi klinis"
			narrative = "Pasien dengan keluhan kronis dan hasil pemeriksaan penunjang lengkap. Tekanan darah, gula darah, dan EKG terlampir. Terapi lini pertama di FKTP sudah diberikan tiga bulan tanpa perbaikan sehingga dirujuk ke poli jantung untuk evaluasi lanjutan dan penyesuaian terapi."
		case i < n*86/100:
			dx = yellowDx[rng.Intn(len(yellowDx))]
			reason = "Keterbatasan alat di faskes asal"
			narrative = "Pasien datang dengan keluhan berulang. Sudah diberi obat dasar. Perlu pemeriksaan lanjutan di rumah sakit."
		default:
			dx = redDx[rng.Intn(len(redDx))]
			reason = "Alat rusak dan SDM tidak ada di faskes asal"
			narrative = "Pasien dirujuk ke rumah sakit."
		}
		req := domain.ReferralRequest{
			ReferralID:            id,
			PatientName:           string(rune('A' + i%26)),
			DoctorID:              doctors[i%len(doctors)],
			OriginFacilityID:      origins[i%len(origins)],
			DestinationFacilityID:   dests[i%len(dests)],
			DiagnosisCode:         dx,
			Reason:                reason,
			ClinicalNarrative:     narrative,
			IssuedAt:              time.Now().AddDate(0, 0, -(i % 30)),
		}
		signals, score, reasons := scorer.ScoreDummy(req)
		decision := engine.Decide(id, score, signals)
		decision.ModelVersion = service.DummyVersion
		decision.SignalsSource = "backend-dummy"
		decision.Reasons = reasons
		store.Upsert(req, decision)
	}
}
