package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/seed"
)

func hospitalHandler(diagnosis, destination string) ReferralHandler {
	h, store := crudHandler(fixedML{score: 5})
	h.Hospitals = repository.MemoryHospitals(seed.Hospitals())
	store.Upsert(domain.ReferralRequest{ReferralID: "fit-1", DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: destination, DiagnosisCode: diagnosis, Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "fit-1", Score: 5, Decision: "green", Status: "SCORED"})
	return h
}

func getFit(h ReferralHandler, role, id, query string) (*httptest.ResponseRecorder, domain.DestinationFit) {
	r := httptest.NewRequest("GET", "/?"+query, nil)
	r.SetPathValue("id", id)
	if role != "" {
		r.Header.Set("X-Actor", role+"@demo.id")
		r.Header.Set("X-Actor-Role", role)
	}
	w := httptest.NewRecorder()
	h.DestinationFit(w, r)
	var out struct{ Fit domain.DestinationFit }
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w, out.Fit
}

func TestDestinationFitForAStoredReferral(t *testing.T) {
	// A heart attack (I21, Kardiovaskular) sent to the heart hospital, to the cancer hospital, and to an unknown one.
	if w, fit := getFit(hospitalHandler("I21.0", "RS Harapan Kita"), "verifikator", "fit-1", ""); w.Code != 200 || fit.Verdict != "belum_terverifikasi" || fit.Checks[0].Result != "ok" {
		t.Fatalf("right specialty, equipment unverified: %d %+v", w.Code, fit)
	}
	if _, fit := getFit(hospitalHandler("I21.0", "RS Kanker Dharmais"), "tkmkb", "fit-1", ""); fit.Verdict != "tidak_sesuai" || fit.Checks[0].Result != "fail" {
		t.Fatalf("a cancer hospital does not treat a heart attack: %+v", fit)
	}
	if _, fit := getFit(hospitalHandler("I21.0", "RS Tidak Ada"), "tkmkb", "fit-1", ""); fit.Verdict != "belum_terverifikasi" || fit.Checks[0].Result != "unknown" {
		t.Fatalf("an unknown destination is unknown, not unsuitable: %+v", fit)
	}
	if _, fit := getFit(hospitalHandler("J06.9", "RS Kanker Dharmais"), "tkmkb", "fit-1", ""); fit.Verdict != "belum_terverifikasi" {
		t.Fatalf("a diagnosis outside the specialist table is not judged: %+v", fit)
	}
	if _, fit := getFit(hospitalHandler("I21.0", "RS Harapan Kita"), "tkmkb", "fit-1", "distance_km=350"); len(fit.Checks) != 3 || fit.Verdict != "belum_terverifikasi" {
		t.Fatalf("distance is added as an informational check only: %+v", fit)
	}
}

func TestDestinationFitAccessAndInput(t *testing.T) {
	h := hospitalHandler("I21.0", "RS Harapan Kita")
	for _, role := range []string{"dokter", "dinkes", ""} {
		if w, _ := getFit(h, role, "fit-1", ""); w.Code != http.StatusForbidden {
			t.Errorf("%q: want 403, got %d", role, w.Code)
		}
	}
	for _, q := range []string{"distance_km=-1", "distance_km=abc", "distance_km=2001", "distance_km=NaN"} {
		if w, _ := getFit(h, "tkmkb", "fit-1", q); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", q, w.Code)
		}
	}
	if w, _ := getFit(h, "tkmkb", "nope", ""); w.Code != http.StatusNotFound {
		t.Errorf("unknown referral: want 404, got %d", w.Code)
	}
}

func TestHospitalListFiltersByKindAndRegion(t *testing.T) {
	h := hospitalHandler("I21.0", "x")
	get := func(role, q string) (int, int) {
		r := httptest.NewRequest("GET", "/?"+q, nil)
		r.Header.Set("X-Actor", role+"@demo.id")
		r.Header.Set("X-Actor-Role", role)
		w := httptest.NewRecorder()
		h.HospitalList(w, r)
		var out struct{ Total int }
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out.Total
	}
	if code, n := get("dinkes", ""); code != 200 || n != 9 {
		t.Fatalf("all hospitals: %d %d", code, n)
	}
	if _, n := get("verifikator", "kind=khusus"); n != 3 {
		t.Fatalf("three specialist hospitals, got %d", n)
	}
	if _, n := get("tkmkb", "kind=khusus&wilayah=jakarta+barat"); n != 2 { // RS Harapan Kita and RS Kanker Dharmais
		t.Fatalf("the region filter is case-insensitive: want 2, got %d", n)
	}
	if _, n := get("tkmkb", "kind=khusus&wilayah=jakarta+pusat"); n != 0 {
		t.Fatalf("no specialist hospital in Jakarta Pusat, got %d", n)
	}
	if code, _ := get("tkmkb", "kind=bogus"); code != http.StatusBadRequest {
		t.Fatalf("unknown kind: want 400, got %d", code)
	}
	if code, _ := get("dokter", ""); code != http.StatusForbidden {
		t.Fatalf("doctor: want 403, got %d", code)
	}
	if !strings.Contains(seed.DirectorySource, "demo") {
		t.Fatal("the demo directory must say it is a demo")
	}
}
