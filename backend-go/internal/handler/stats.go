package handler

import (
	"net/http"
	"sort"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

const unknownRegion = "Tidak diketahui"

type wilayahStat struct {
	Wilayah      string   `json:"wilayah"`
	Faskes       int      `json:"faskes"`
	Rujukan      int      `json:"rujukan"`
	PersenTinggi float64  `json:"persen_tinggi"`
	MedianNS     *float64 `json:"median_ns"` // percent; nil when no doctor in the region has enough history
	HHIRata      *float64 `json:"hhi_rata"`
}

type dokterStat struct {
	DoctorID     string  `json:"doctor_id"`
	Faskes       string  `json:"faskes"`
	TotalRujukan int     `json:"total_rujukan"`
	RisikoTinggi int     `json:"risiko_tinggi"`
	Persentase   float64 `json:"persentase"`
	// Emergency referrals skip synchronous scoring (is_emergency comes from the issuer), so a doctor whose share is
	// far above peers is the abuse signal.
	Darurat       int     `json:"darurat"`
	PersenDarurat float64 `json:"persen_darurat"`
	Narasi        string  `json:"narasi"` // top ML reason of this doctor's highest-scored referral
}

type statsResponse struct {
	// Synthetic is true when any row is seed data, so Analytics and Dinkes can say so on screen.
	Synthetic bool          `json:"synthetic"`
	Wilayah   []wilayahStat `json:"wilayah"`
	Dokter    []dokterStat  `json:"dokter"`
}

// Stats: GET /stats. Aggregates only (no patient fields), built from ML scores and stored feature snapshots.
func (h ReferralHandler) Stats(w http.ResponseWriter, r *http.Request) {
	_, role, ok := actorIn(w, r, roleVerifikator, roleTKMKB, roleDinkes)
	if !ok {
		return
	}
	var items []domain.StoredReferral
	if h.Store != nil {
		items = h.Store.List()
	}
	stats := buildStats(items)
	if role == roleDinkes { // data minimization: Dinkes sees facility/region aggregates, never per-doctor rows
		stats.Dokter = []dokterStat{}
	}
	writeJSON(w, http.StatusOK, stats)
}

func buildStats(items []domain.StoredReferral) statsResponse {
	regions := map[string]*regionAgg{}
	doctors := map[string]*doctorAgg{}
	synthetic := false
	for _, it := range items {
		synthetic = synthetic || it.Synthetic
		region := it.Request.OriginWilayah
		if region == "" {
			region = unknownRegion
		}
		get(regions, region, newRegionAgg).add(it)
		get(doctors, it.Request.DoctorID, newDoctorAgg).add(it)
	}

	out := statsResponse{Synthetic: synthetic, Wilayah: []wilayahStat{}, Dokter: []dokterStat{}}
	for name, a := range regions {
		out.Wilayah = append(out.Wilayah, a.stat(name))
	}
	for id, a := range doctors {
		out.Dokter = append(out.Dokter, a.stat(id))
	}
	sort.Slice(out.Wilayah, func(i, j int) bool { return out.Wilayah[i].Wilayah < out.Wilayah[j].Wilayah })
	sort.Slice(out.Dokter, func(i, j int) bool { return out.Dokter[i].Persentase > out.Dokter[j].Persentase })
	return out
}

func get[T any](m map[string]*T, key string, create func() *T) *T {
	if v, ok := m[key]; ok {
		return v
	}
	v := create()
	m[key] = v
	return v
}

func isRed(d domain.RiskDecision) bool { return d.Decision == "red" }

func percent(part, whole int) float64 { return round1(100 * float64(part) / float64(whole)) }

func round1(x float64) float64 { return float64(int(x*10+0.5)) / 10 }

type regionAgg struct {
	facilities map[string]bool
	total, red int
	nsPercent  []float64
	hhi        []float64
}

func newRegionAgg() *regionAgg { return &regionAgg{facilities: map[string]bool{}} }

func (a *regionAgg) add(it domain.StoredReferral) {
	a.facilities[it.Request.OriginFacilityID] = true
	a.total++
	if isRed(it.Decision) {
		a.red++
	}
	f := it.Decision.Features
	if f == nil {
		return
	}
	if f.Doctor.NS90 != nil {
		a.nsPercent = append(a.nsPercent, *f.Doctor.NS90*100)
	}
	if f.Doctor.HHI180 != nil {
		a.hhi = append(a.hhi, *f.Doctor.HHI180)
	}
}

func (a *regionAgg) stat(name string) wilayahStat {
	return wilayahStat{
		Wilayah: name, Faskes: len(a.facilities), Rujukan: a.total, PersenTinggi: percent(a.red, a.total),
		MedianNS: rounded(median(a.nsPercent)), HHIRata: truncated(mean(a.hhi)),
	}
}

type doctorAgg struct {
	total, red, emergency int
	latest                time.Time
	facility              string
	topScore              float64
	narrative             string
}

func newDoctorAgg() *doctorAgg { return &doctorAgg{} }

func (a *doctorAgg) add(it domain.StoredReferral) {
	a.total++
	if it.Request.IsEmergency {
		a.emergency++
	}
	if isRed(it.Decision) {
		a.red++
	}
	if it.Request.IssuedAt.After(a.latest) {
		a.latest, a.facility = it.Request.IssuedAt, it.Request.OriginFacilityID
	}
	if reasons := it.Decision.Reasons; len(reasons) > 0 && it.Decision.Score >= a.topScore {
		a.topScore, a.narrative = it.Decision.Score, reasons[0].Detail
	}
}

func (a *doctorAgg) stat(id string) dokterStat {
	return dokterStat{DoctorID: id, Faskes: a.facility, TotalRujukan: a.total, RisikoTinggi: a.red, Persentase: percent(a.red, a.total),
		Darurat: a.emergency, PersenDarurat: percent(a.emergency, a.total), Narasi: a.narrative}
}

func median(v []float64) *float64 {
	if len(v) == 0 {
		return nil
	}
	s := append([]float64(nil), v...)
	sort.Float64s(s)
	m := s[len(s)/2]
	if len(s)%2 == 0 {
		m = (s[len(s)/2-1] + s[len(s)/2]) / 2
	}
	return &m
}

func mean(v []float64) *float64 {
	if len(v) == 0 {
		return nil
	}
	sum := 0.0
	for _, x := range v {
		sum += x
	}
	m := sum / float64(len(v))
	return &m
}

func rounded(v *float64) *float64 {
	if v == nil {
		return nil
	}
	r := round1(*v)
	return &r
}

func truncated(v *float64) *float64 {
	if v == nil {
		return nil
	}
	t := float64(int(*v))
	return &t
}
