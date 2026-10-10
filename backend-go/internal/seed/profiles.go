package seed

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

// Sources are optional paths to the ML service's diagnosis tables (lines "codes|name|group|PPK text"). With them,
// legitimate rows use real specialist diagnoses and their PPK text as narrative; without, a small built-in set.
type Sources struct{ KNS, Specialist string }

type diagnosis struct{ code, text string }

var (
	fallbackKNS = []diagnosis{
		{"J06.9", "batuk pilek demam ringan sejak dua hari"},
		{"K30", "nyeri ulu hati kembung mual"},
		{"I10", "tekanan darah tinggi tanpa keluhan berat"},
	}
	fallbackSpecialist = []diagnosis{
		{"I50", "sesak napas saat aktivitas bengkak tungkai ekokardiografi"},
		{"N18.3", "penyakit ginjal kronik laboratorium kreatinin meningkat"},
		{"J18", "pneumonia foto toraks infiltrat batuk berdahak demam"},
	}
	genericNarratives = []string{
		"Pasien dirujuk ke rumah sakit.",
		"Mohon penanganan lebih lanjut di rumah sakit.",
		"Keluhan sejak beberapa hari, dirujuk untuk pemeriksaan lanjutan.",
	}
)

// profile is one doctor's behaviour. The doctor-level history is synthetic stand-in for the nightly batch; the score,
// category and reasons of every row still come from the real model (or the dummy engine when ML is off).
type profile struct {
	doctor          string
	weightPercent   int
	history         domain.ReferralContext
	reason          string
	reasonCategory  string
	specialistShare float64 // share of rows with a specialist diagnosis (a legitimate referral)
	genericShare    float64 // share of rows with a vague narrative
	fixedDestShare  float64 // share of rows sent to the doctor's favourite hospital
}

func profiles() []profile {
	n := func(v float64) *float64 { return &v }
	normal := func(doctor string) profile {
		return profile{doctor, 21, domain.ReferralContext{N90: 30, NS90: n(0.05), N180: 60, HHI180: n(900)}, "Rujukan spesialis sesuai indikasi klinis", "clinical", 0.85, 0.05, 0.1}
	}
	return []profile{
		{"d-001", 4, domain.ReferralContext{Stratum: "rural|puskesmas", N90: 40, NS90: n(0.9), N180: 80, HHI180: n(6000), SisruteAvailable: true, SisruteAgeDays: 1},
			"Alat rusak dan SDM tidak ada di faskes asal", "equipment", 0, 1, 1},
		{"d-002", 12, domain.ReferralContext{Stratum: "urban|puskesmas", N90: 30, NS90: n(0.25), N180: 60, HHI180: n(1700), SisruteAgeDays: 45},
			"Keterbatasan alat di faskes asal", "equipment", 0.5, 0.3, 0.5},
		normal("d-003"), normal("d-004"), normal("d-005"), normal("d-006"),
	}
}

func loadDiagnoses(path string, fallback []diagnosis) []diagnosis {
	data, err := os.ReadFile(path)
	if path == "" || err != nil {
		return fallback
	}
	var out []diagnosis
	for _, line := range strings.Split(string(data), "\n") {
		f := strings.Split(strings.TrimSpace(line), "|")
		if len(f) < 4 || strings.HasPrefix(f[0], "#") {
			continue
		}
		code, _, _ := strings.Cut(f[0], ",")
		out = append(out, diagnosis{strings.TrimSpace(code), strings.TrimSpace(f[3])})
	}
	if len(out) == 0 {
		return fallback
	}
	return out
}

func pickProfile(r *rand.Rand, ps []profile) profile {
	roll := r.Intn(100)
	for _, p := range ps {
		if roll -= p.weightPercent; roll < 0 {
			return p
		}
	}
	return ps[len(ps)-1]
}

// Run fills the store with n deterministic SYNTHETIC referrals and marks each as synthetic. Six doctors with fixed
// behaviour: one with a suspicious pattern, one to watch, four ordinary. The mix of green/yellow/red is not set here:
// it is whatever the model (via eval) makes of those behaviours. eval nil or failing falls back to the dummy heuristic.
func Run(store *repository.MemoryStore, n int, eval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error), src ...Sources) {
	if n <= 0 || store.Count() > 0 {
		return
	}
	var sources Sources
	if len(src) > 0 {
		sources = src[0]
	}
	kns := loadDiagnoses(sources.KNS, fallbackKNS)
	specialist := loadDiagnoses(sources.Specialist, fallbackSpecialist)
	origins, originWilayah, dests, patients := loadFacilities()
	rng := rand.New(rand.NewSource(42))
	ps := profiles()
	doctorIndex := map[string]int{}
	for i, p := range ps {
		doctorIndex[p.doctor] = i
	}

	for i := 0; i < n; i++ {
		p := pickProfile(rng, ps)
		origin := origins[doctorIndex[p.doctor]%len(origins)]
		favourite := dests[doctorIndex[p.doctor]%len(dests)]
		dest := dests[rng.Intn(len(dests))]
		if rng.Float64() < p.fixedDestShare {
			dest = favourite
		}

		dx := kns[rng.Intn(len(kns))]
		if rng.Float64() < p.specialistShare {
			dx = specialist[rng.Intn(len(specialist))]
		}
		narrative := dx.text
		if rng.Float64() < p.genericShare {
			narrative = genericNarratives[rng.Intn(len(genericNarratives))]
		}
		patient := string(rune('A' + i%26))
		if len(patients) > 0 {
			patient = patients[i%len(patients)]
		}

		ctx := p.history
		ctx.ToDominantDest = dest == favourite && p.fixedDestShare >= 0.5
		id := fmt.Sprintf("r-%03d", i+1)
		req := domain.ReferralRequest{
			ReferralID: id, PatientName: patient, DoctorID: p.doctor,
			OriginFacilityID: origin, OriginWilayah: originWilayah[origin], DestinationFacilityID: dest,
			DiagnosisCode: dx.code, Reason: p.reason, ReasonCategory: p.reasonCategory, ClinicalNarrative: narrative,
			IssuedAt: time.Now().Add(-time.Duration(rng.Intn(90*24)) * time.Hour), Context: ctx,
		}
		store.UpsertSynthetic(req, score(req, eval))
	}
}

func score(req domain.ReferralRequest, eval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error)) domain.RiskDecision {
	if eval != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if d, err := eval(ctx, req); err == nil {
			return d
		}
	}
	d := service.DummyEngine.Decide(req.ReferralID, service.ScoreDummy(req))
	d.SignalsSource = "backend-dummy"
	return d
}
