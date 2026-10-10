package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

type kns map[string]bool

func (k kns) Known() bool                   { return len(k) > 0 }
func (k kns) IsNonSpecialist(c string) bool { return k[c] }

func referrals(doctor string, n int, dest func(i int) string, dx string, now time.Time) []domain.StoredReferral {
	out := make([]domain.StoredReferral, n)
	for i := range out {
		out[i].Request = domain.ReferralRequest{
			ReferralID: fmt.Sprint(doctor, i), DoctorID: doctor, DestinationFacilityID: dest(i),
			DiagnosisCode: dx, IssuedAt: now.AddDate(0, 0, -1-(i%60)), // strictly before now: a referral never counts itself
		}
	}
	return out
}

func TestFeaturesNSAndHHI(t *testing.T) {
	now := time.Now()
	items := referrals("d1", 40, func(int) string { return "RS-A" }, "J06.9", now)
	f := ComputeDoctorFeatures(items, kns{"J06.9": true}, now)["d1"]
	if f.NS90 == nil || *f.NS90 != 1 || f.HHI180 == nil || *f.HHI180 != 10000 || f.DominantDest != "RS-A" || f.N90 != 40 {
		t.Fatalf("one destination and all non-specialist: %+v", f)
	}
}

func TestBelowMinimumSampleStaysNil(t *testing.T) {
	now := time.Now()
	f := ComputeDoctorFeatures(referrals("d1", 10, func(int) string { return "RS-A" }, "J06.9", now), kns{"J06.9": true}, now)["d1"]
	if f.NS90 != nil || f.HHI180 != nil || f.N90 != 10 {
		t.Fatalf("cold start must be nil, not a guess: %+v", f)
	}
}

func TestNSStaysNilWithoutKNSList(t *testing.T) {
	now := time.Now()
	f := ComputeDoctorFeatures(referrals("d1", 40, func(i int) string { return fmt.Sprint("RS", i%8) }, "J06.9", now), kns{}, now)["d1"]
	if f.NS90 != nil {
		t.Fatalf("without the KNS list NS must not be invented: %v", *f.NS90)
	}
	if f.HHI180 == nil || *f.HHI180 > 1500 {
		t.Fatalf("eight equal destinations => HHI 1250: %v", f.HHI180)
	}
}

func TestOldReferralsAreOutsideTheWindow(t *testing.T) {
	now := time.Now()
	old := referrals("d1", 5, func(int) string { return "RS" }, "I10", now.AddDate(0, 0, -400))
	if _, ok := ComputeDoctorFeatures(old, kns{}, now)["d1"]; ok {
		t.Fatal("referrals older than 180 days must not count")
	}
}

func TestFeaturesAsOfSeesOnlyThePastAndNotItself(t *testing.T) {
	now := time.Now()
	issue := now.AddDate(0, 0, -30)
	var items []domain.StoredReferral
	items = append(items, referrals("d1", 35, func(int) string { return "RS-A" }, "J06.9", issue.AddDate(0, 0, -1))...) // before: 1 day older than issue
	for i := range items {
		items[i].Request.IssuedAt = issue.AddDate(0, 0, -1-(i%60))
	}
	later := referrals("d1", 10, func(int) string { return "RS-B" }, "J06.9", now) // after issue: must not count
	for i := range later {
		later[i].Request.ReferralID = fmt.Sprint("late", i)
	}
	self := domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: "self", DoctorID: "d1", DestinationFacilityID: "RS-C", IssuedAt: issue}}
	all := append(append(items, later...), self)

	f := FeaturesAsOf(all, "d1", "self", kns{"J06.9": true}, issue)
	if f.N180 != 35 || f.DominantDest != "RS-A" || f.HHI180 == nil || *f.HHI180 != 10000 {
		t.Fatalf("must count only the 35 earlier referrals: %+v", f)
	}
}

func TestFeaturesAsOfLeavesNearestUnknown(t *testing.T) {
	now := time.Now()
	f := FeaturesAsOf(referrals("d1", 40, func(int) string { return "RS" }, "I10", now.AddDate(0, 0, -5)), "d1", "", kns{}, now)
	if f.DestIsNearest != nil {
		t.Fatal("no distance data: nearest must stay unknown (nil), not true")
	}
}
