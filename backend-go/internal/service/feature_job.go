package service

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// Windows and minimum sample sizes from the proposal (section 4): NS over 90 days with n>=20, HHI over 180 days with n>=30.
const (
	nsWindow, nsMinN   = 90 * 24 * time.Hour, 20
	hhiWindow, hhiMinN = 180 * 24 * time.Hour, 30
)

// KNSList says whether a diagnosis is one of the 144 non-specialist ones. Known()==false means NS cannot be computed.
type KNSList interface {
	Known() bool
	IsNonSpecialist(icd string) bool
}

// ReferralSource is the set of referrals the batch job reads. PoC: the in-memory store; production: the referrals table.
type ReferralSource interface {
	List() []domain.StoredReferral
}

// ComputeDoctorFeatures derives NS(d) and HHI(d) for every doctor as of now (the nightly batch).
func ComputeDoctorFeatures(items []domain.StoredReferral, kns KNSList, now time.Time) map[string]domain.DoctorFeatures {
	byDoctor := map[string][]domain.ReferralRequest{}
	for _, it := range items {
		byDoctor[it.Request.DoctorID] = append(byDoctor[it.Request.DoctorID], it.Request)
	}
	out := make(map[string]domain.DoctorFeatures, len(byDoctor))
	for doctor, refs := range byDoctor {
		if f, ok := featuresFor(refs, "", kns, now); ok {
			out[doctor] = f
		}
	}
	return out
}

// FeaturesAsOf is the point-in-time version for one referral: only that doctor's referrals issued before asOf, the
// referral itself excluded, so a re-score months later sees what the system could have seen at issue time.
func FeaturesAsOf(items []domain.StoredReferral, doctorID, excludeID string, kns KNSList, asOf time.Time) domain.DoctorFeatures {
	var refs []domain.ReferralRequest
	for _, it := range items {
		if it.Request.DoctorID == doctorID {
			refs = append(refs, it.Request)
		}
	}
	f, _ := featuresFor(refs, excludeID, kns, asOf)
	return f
}

// featuresFor tallies one doctor's referrals in the 90/180-day windows before asOf. Below the minimum sample a value
// stays nil (cold start) instead of being guessed, and NS stays nil without a KNS list. ok is false when no referral
// falls in the window. DestIsNearest stays nil: there is no distance data yet.
func featuresFor(refs []domain.ReferralRequest, excludeID string, kns KNSList, asOf time.Time) (domain.DoctorFeatures, bool) {
	knsKnown := kns != nil && kns.Known() // a missing list means NS stays unknown, never a crash
	var n90, nonSpecialist, n180 int
	byDest := map[string]int{}
	for _, q := range refs {
		age := asOf.Sub(q.IssuedAt)
		if q.ReferralID == excludeID || age <= 0 || age > hhiWindow {
			continue
		}
		n180++
		byDest[q.DestinationFacilityID]++
		if age <= nsWindow {
			n90++
			if knsKnown && kns.IsNonSpecialist(q.DiagnosisCode) {
				nonSpecialist++
			}
		}
	}
	if n180 == 0 {
		return domain.DoctorFeatures{}, false
	}
	f := domain.DoctorFeatures{N90: n90, N180: n180}
	if knsKnown && n90 >= nsMinN {
		ns := float64(nonSpecialist) / float64(n90)
		f.NS90 = &ns
	}
	hhi, dominant := 0.0, ""
	for dest, n := range byDest {
		share := float64(n) / float64(n180)
		hhi += share * share * 10000
		if n > byDest[dominant] {
			dominant = dest
		}
	}
	f.DominantDest = dominant
	if n180 >= hhiMinN {
		f.HHI180 = &hhi
	}
	return f, true
}

// RunFeatureJob refreshes doctor:{id} in the cache now and then every interval, until ctx ends.
func RunFeatureJob(ctx context.Context, src ReferralSource, cache Cache, kns KNSList, every time.Duration) {
	refresh := func() {
		features := ComputeDoctorFeatures(src.List(), kns, time.Now())
		for doctor, f := range features {
			b, _ := json.Marshal(f)
			if err := cache.Set(ctx, "doctor:"+doctor, b); err != nil {
				log.Printf("feature job: cache unavailable (%v); scoring falls back to cold start", err)
				return
			}
		}
		log.Printf("feature job: refreshed %d doctors (KNS list loaded: %v)", len(features), kns != nil && kns.Known())
	}
	refresh()
	tick := time.NewTicker(every)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			refresh()
		}
	}
}
