package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// pagedHandler holds n referrals with many tied scores, three risk levels (every red is a held claim until TKMKB
// decides), two doctors and two regions. d-2's referrals are the odd ones.
func pagedHandler(n int) (ReferralHandler, *repository.MemoryStore) {
	store := repository.NewMemoryStore()
	for i := 0; i < n; i++ {
		decision := [...]string{"green", "yellow", "red"}[i%3]
		doctor, wilayah := "d-1", "Jakarta Pusat"
		if i%2 == 1 {
			doctor, wilayah = "d-2", "Jakarta Barat"
		}
		id := fmt.Sprintf("p-%03d", i)
		store.Upsert(domain.ReferralRequest{ReferralID: id, PatientName: "Bambang Sutrisno", DoctorID: doctor, OriginWilayah: wilayah,
			OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
			domain.RiskDecision{ReferralID: id, Score: float64(i % 4 * 10), Decision: decision, Status: "SCORED"})
	}
	users := repository.NewMemoryUsers("")
	_ = users.Put(context.Background(), domain.User{Email: "dokter@demo.id", Nama: "dr", Role: "dokter", DoctorID: "d-1"})
	return ReferralHandler{Store: store, Users: users}, store
}

func getList(h ReferralHandler, role, query string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("GET", "/api/v1/referrals?"+query, nil)
	email := role + "@demo.id"
	if role == "" {
		email = ""
	} else {
		r.Header.Set("X-Actor", email)
		r.Header.Set("X-Actor-Role", role)
	}
	w := httptest.NewRecorder()
	h.List(w, r)
	return w
}

type pageBody struct {
	Items []struct {
		Request struct {
			ReferralID  string `json:"referral_id"`
			PatientName string `json:"patient_name"`
		}
		Decision map[string]any
		Claim    string `json:"claim_status"`
	}
	Next    *string
	Total   int
	Summary struct {
		Counts struct{ Red, Yellow, Green int }
		Held   int
	}
}

func decodePage(t *testing.T, w *httptest.ResponseRecorder) pageBody {
	t.Helper()
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d %s", w.Code, w.Body)
	}
	var p pageBody
	if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
		t.Fatalf("not a page: %v %s", err, w.Body)
	}
	return p
}

// walk follows next until the last page and returns every id in order.
func walk(t *testing.T, h ReferralHandler, role, query string, limit int) (ids []string, last pageBody) {
	t.Helper()
	cursor := ""
	for pages := 0; pages < 100; pages++ {
		q := fmt.Sprintf("limit=%d&%s", limit, query)
		if cursor != "" {
			q += "&cursor=" + cursor
		}
		p := decodePage(t, getList(h, role, q))
		for _, it := range p.Items {
			ids = append(ids, it.Request.ReferralID)
		}
		if last = p; p.Next == nil {
			return ids, p
		}
		cursor = *p.Next
	}
	t.Fatal("paging never ended")
	return
}

func TestListWithoutLimitStaysAPlainArray(t *testing.T) {
	h, _ := pagedHandler(5)
	if body := getList(h, "verifikator", "").Body.String(); !strings.HasPrefix(body, "[") {
		t.Fatalf("older clients expect a bare array, got %.40s", body)
	}
}

func TestPagesKeepHeldFirstThenRiskThenScoreThenIDAndCoverEveryRowOnce(t *testing.T) {
	h, store := pagedHandler(30)
	ids, last := walk(t, h, "verifikator", "", 7)
	if len(ids) != 30 || last.Total != 30 {
		t.Fatalf("want 30 rows once each, got %d (total %d)", len(ids), last.Total)
	}
	seen := map[string]bool{}
	rank := map[string]int{"red": 0, "yellow": 1, "green": 2}
	prevKey := [3]float64{-1, -1, 0}
	for i, id := range ids {
		if seen[id] {
			t.Fatalf("%s appears twice", id)
		}
		seen[id] = true
		item, _ := store.Get(id)
		held := 1.0
		if item.ClaimStatus == domain.ClaimHeld {
			held = 0
		}
		key := [3]float64{held, float64(rank[item.Decision.Decision]), -item.Decision.Score}
		if i > 0 && (key[0] < prevKey[0] || (key[0] == prevKey[0] && (key[1] < prevKey[1] || (key[1] == prevKey[1] && key[2] < prevKey[2])))) {
			t.Fatalf("%s is out of order after %s: %v < %v", id, ids[i-1], key, prevKey)
		}
		prevKey = key
	}
	if first := decodePage(t, getList(h, "verifikator", "limit=3")); first.Items[0].Claim != domain.ClaimHeld {
		t.Fatalf("the first row must be a held claim: %+v", first.Items[0])
	}
}

func TestTotalMatchesStatsAndSummaryIgnoresLimitCursorAndRisk(t *testing.T) {
	h, _ := pagedHandler(30)
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Actor", "t@demo.id")
	r.Header.Set("X-Actor-Role", "tkmkb")
	h.Stats(w, r)
	var stats struct {
		Dokter []struct {
			TotalRujukan int `json:"total_rujukan"`
		}
	}
	if err := json.Unmarshal(w.Body.Bytes(), &stats); err != nil {
		t.Fatalf("stats: %v %s", err, w.Body)
	}
	sum := 0
	for _, d := range stats.Dokter {
		sum += d.TotalRujukan
	}
	first := decodePage(t, getList(h, "tkmkb", "limit=4"))
	if first.Total != sum || sum != 30 {
		t.Fatalf("total %d must equal the %d rows /stats counts", first.Total, sum)
	}
	if c := first.Summary.Counts; c.Red != 10 || c.Yellow != 10 || c.Green != 10 || first.Summary.Held != 10 {
		t.Fatalf("summary: %+v", first.Summary)
	}
	later := decodePage(t, getList(h, "tkmkb", "limit=4&cursor="+*first.Next))
	onlyRed := decodePage(t, getList(h, "tkmkb", "limit=4&risk=red"))
	if later.Summary != first.Summary || onlyRed.Summary != first.Summary {
		t.Fatalf("summary must not change with cursor or the risk filter: %+v %+v %+v", first.Summary, later.Summary, onlyRed.Summary)
	}
	if onlyRed.Total != 10 {
		t.Fatalf("total is counted after the filter, got %d", onlyRed.Total)
	}
}

func TestSummaryIgnoresRiskAndStatusSoEveryChipKeepsItsNumber(t *testing.T) {
	h, _ := pagedHandler(30) // 10 red (all held), 10 yellow, 10 green
	want := decodePage(t, getList(h, "tkmkb", "limit=5")).Summary
	for q, total := range map[string]int{"status=ditahan": 10, "status=normal": 20, "status=ditahan&risk=red": 10, "status=normal&risk=green": 10} {
		p := decodePage(t, getList(h, "tkmkb", "limit=5&"+q))
		if p.Total != total || p.Summary != want {
			t.Errorf("%s: total %d (want %d), summary %+v (want %+v)", q, p.Total, total, p.Summary, want)
		}
	}
	if want.Counts.Red != 10 || want.Counts.Yellow != 10 || want.Counts.Green != 10 || want.Held != 10 {
		t.Fatalf("baseline summary: %+v", want)
	}
	// q and wilayah do narrow it: p-01x are 10 rows; Jakarta Barat is the odd ones.
	if p := decodePage(t, getList(h, "tkmkb", "limit=5&q=p-01&status=ditahan")); p.Summary.Counts.Red+p.Summary.Counts.Yellow+p.Summary.Counts.Green != 10 {
		t.Fatalf("summary follows q: %+v", p.Summary)
	}
}

func TestRegionFilterMatchesStatsForEveryOptionIncludingUnknown(t *testing.T) {
	h, store := pagedHandler(30)
	for i := 0; i < 3; i++ { // referrals scored without an origin_wilayah
		id := fmt.Sprintf("u-%d", i)
		store.Upsert(domain.ReferralRequest{ReferralID: id, DoctorID: "d-1", OriginFacilityID: "f-1", DestinationFacilityID: "f-2", DiagnosisCode: "I10", Reason: "x", IssuedAt: time.Now()},
			domain.RiskDecision{ReferralID: id, Score: 1, Decision: "green", Status: "SCORED"})
	}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Actor", "t@demo.id")
	r.Header.Set("X-Actor-Role", "tkmkb")
	h.Stats(w, r)
	var stats struct {
		Wilayah []struct {
			Wilayah string `json:"wilayah"`
			Rujukan int    `json:"rujukan"`
		}
	}
	if err := json.Unmarshal(w.Body.Bytes(), &stats); err != nil || len(stats.Wilayah) != 3 {
		t.Fatalf("expected Jakarta Pusat, Jakarta Barat and the unknown group in /stats: %v %s", err, w.Body)
	}
	for _, region := range stats.Wilayah {
		if p := decodePage(t, getList(h, "tkmkb", "limit=50&wilayah="+url.QueryEscape(region.Wilayah))); p.Total != region.Rujukan {
			t.Errorf("wilayah %q: /referrals has %d rows, /stats has %d", region.Wilayah, p.Total, region.Rujukan)
		}
	}
	if p := decodePage(t, getList(h, "tkmkb", "limit=50&wilayah=tidak+diketahui")); p.Total != 3 {
		t.Fatalf("the unknown group is the three rows without a region, got %d", p.Total)
	}
}

func TestFiltersNarrowTotalAndPages(t *testing.T) {
	h, _ := pagedHandler(30)
	ids, last := walk(t, h, "verifikator", "risk=yellow&wilayah=jakarta+barat", 3)
	if last.Total != len(ids) || len(ids) == 0 {
		t.Fatalf("total %d vs %d rows", last.Total, len(ids))
	}
	for _, id := range ids { // yellow is i%3==1 and Jakarta Barat is odd i
		var i int
		fmt.Sscanf(id, "p-%d", &i)
		if i%3 != 1 || i%2 != 1 {
			t.Fatalf("%s does not match risk=yellow and wilayah=Jakarta Barat", id)
		}
	}
	if p := decodePage(t, getList(h, "verifikator", "limit=5&status=dilepas")); p.Total != 0 || len(p.Items) != 0 {
		t.Fatalf("no claim is released: %+v", p)
	}
}

func TestSearchFindsIdsDiagnosisAndFacilityNamesAndFollowsTotalAndSummary(t *testing.T) {
	h, store := pagedHandler(30)
	store.Upsert(domain.ReferralRequest{ReferralID: "x-1", DoctorID: "d-1", OriginFacilityID: "f-9", OriginFacilityName: "Puskesmas Gambir", DestinationFacilityID: "f-8",
		DestinationFacilityName: "RSUD Pasar Rebo", DiagnosisCode: "J06.9", Reason: "x", IssuedAt: time.Now()},
		domain.RiskDecision{ReferralID: "x-1", Score: 5, Decision: "green", Status: "SCORED"})
	for q, want := range map[string]int{"P-01": 10, "p-010": 1, "GAMBIR": 1, "pasar rebo": 1, "j06": 1, "i10": 30, "f-9": 1, "nomatch": 0, "  gambir ": 1} {
		if p := decodePage(t, getList(h, "verifikator", "limit=50&q="+strings.ReplaceAll(q, " ", "+"))); p.Total != want {
			t.Errorf("q=%q: want %d rows, got %d", q, want, p.Total)
		}
	}
	p := decodePage(t, getList(h, "verifikator", "limit=2&q=p-01"))
	if p.Total != 10 || p.Summary.Counts.Red+p.Summary.Counts.Yellow+p.Summary.Counts.Green != 10 || p.Next == nil {
		t.Fatalf("total and summary follow the search: %+v", p)
	}
	next := decodePage(t, getList(h, "verifikator", "limit=2&q=p-01&cursor="+*p.Next))
	if next.Total != 10 || next.Items[0].Request.ReferralID == p.Items[0].Request.ReferralID {
		t.Fatalf("the cursor continues inside the search: %+v", next)
	}
}

func TestSearchCannotFindPatientNamesOrOtherDoctorsRows(t *testing.T) {
	h, _ := pagedHandler(30)
	if p := decodePage(t, getList(h, "verifikator", "limit=5&q=bambang")); p.Total != 0 {
		t.Fatalf("a patient's name must not be searchable: %d rows", p.Total)
	}
	if p := decodePage(t, getList(h, "dokter", "limit=50&q=d-2")); p.Total != 0 {
		t.Fatalf("a doctor's search stays inside their own rows: %d rows", p.Total)
	}
	if w := getList(h, "verifikator", "limit=5&q="+strings.Repeat("a", 101)); w.Code != http.StatusBadRequest {
		t.Fatalf("q is at most 100 characters, got %d", w.Code)
	}
	if w := getList(h, "verifikator", "limit=5&q=a%00b"); w.Code != http.StatusBadRequest {
		t.Fatalf("q with a control character: want 400, got %d", w.Code)
	}
}

func TestEveryPageIsRedactedForTheRole(t *testing.T) {
	h, _ := pagedHandler(30)
	cursor := ""
	for {
		q := "limit=4"
		if cursor != "" {
			q += "&cursor=" + cursor
		}
		p := getList(h, "verifikator", q)
		body, pg := p.Body.String(), decodePage(t, p)
		if strings.Contains(body, "Bambang") || strings.Contains(body, "Sutrisno") || !strings.Contains(body, "B*** S***") {
			t.Fatalf("verifier pages show only initials: %.200s", body)
		}
		if pg.Next == nil {
			break
		}
		cursor = *pg.Next
	}
	cursor = ""
	for {
		q := "limit=4"
		if cursor != "" {
			q += "&cursor=" + cursor
		}
		w := getList(h, "dokter", q)
		body, pg := w.Body.String(), decodePage(t, w)
		if strings.Contains(body, "Bambang") || strings.Contains(body, `"score"`) || strings.Contains(body, `"signals"`) {
			t.Fatalf("doctor pages carry no patient name or score: %.300s", body)
		}
		for _, it := range pg.Items {
			var i int
			fmt.Sscanf(it.Request.ReferralID, "p-%d", &i)
			if i%2 != 0 {
				t.Fatalf("a doctor sees only their own referrals, got %s", it.Request.ReferralID)
			}
		}
		if pg.Next == nil {
			break
		}
		raw, _ := base64.RawURLEncoding.DecodeString(*pg.Next)
		if !strings.Contains(string(raw), `"s":0`) {
			t.Fatalf("a doctor's cursor must not carry a score: %s", raw)
		}
		cursor = *pg.Next
	}
	if p := decodePage(t, getList(h, "dinkes", "limit=4")); p.Total != 0 || len(p.Items) != 0 {
		t.Fatalf("Dinkes sees no patient rows: %+v", p)
	}
}

func TestBadCursorsLimitsAndFiltersAre400NeverAnError(t *testing.T) {
	h, _ := pagedHandler(10)
	notJSON := base64.RawURLEncoding.EncodeToString([]byte("garbage"))
	noID := base64.RawURLEncoding.EncodeToString([]byte(`{"h":0,"k":0,"s":1}`))
	extraKey := base64.RawURLEncoding.EncodeToString([]byte(`{"h":0,"k":0,"s":1,"i":"x","admin":true}`))
	outOfRange := base64.RawURLEncoding.EncodeToString([]byte(`{"h":9,"k":0,"s":1,"i":"x"}`))
	for name, q := range map[string]string{
		"cursor not base64": "limit=5&cursor=%%%", "cursor not json": "limit=5&cursor=" + notJSON, "cursor without id": "limit=5&cursor=" + noID,
		"cursor out of range": "limit=5&cursor=" + outOfRange, "cursor with an unknown key": "limit=5&cursor=" + extraKey,
		"limit twice": "limit=5&limit=6", "risk twice": "limit=5&risk=red&risk=green", "q twice": "limit=5&q=a&q=b", "cursor without limit": "cursor=" + notJSON,
		"limit 0": "limit=0", "limit negative": "limit=-3", "limit text": "limit=abc", "limit empty": "limit=",
		"unknown risk": "limit=5&risk=blue", "unknown status": "limit=5&status=lunas",
	} {
		if w := getList(h, "verifikator", q); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", name, w.Code)
		}
	}
}

func TestLimitIsCapped(t *testing.T) {
	h, _ := pagedHandler(150)
	p := decodePage(t, getList(h, "tkmkb", "limit=100000"))
	if len(p.Items) != maxPageLimit || p.Next == nil || p.Total != 150 {
		t.Fatalf("a huge limit must stay at %d rows per page: got %d, next=%v, total=%d", maxPageLimit, len(p.Items), p.Next, p.Total)
	}
}

func TestCursorSurvivesTheRowItPointsToLeaving(t *testing.T) {
	h, store := pagedHandler(30)
	first := decodePage(t, getList(h, "tkmkb", "limit=5"))
	lastOnPage := first.Items[len(first.Items)-1].Request.ReferralID
	if err := store.Archive(lastOnPage, domain.AuditReview{Role: roleTKMKB, Outcome: domain.OutcomeArchived, Note: "x"}); err != nil {
		t.Fatal(err)
	}
	second := decodePage(t, getList(h, "tkmkb", "limit=5&cursor="+*first.Next))
	if len(second.Items) != 5 {
		t.Fatalf("the next page must still continue after the cursor row is archived, got %d rows", len(second.Items))
	}
	for _, it := range second.Items {
		if it.Request.ReferralID == lastOnPage {
			t.Fatalf("archived row came back")
		}
	}
}

func TestFacilityNamesAreOptionalDisplayTextAndValidated(t *testing.T) {
	h, _ := crudHandler(fixedML{score: 5})
	ok := strings.Replace(scoreBody("d-1", "I10", "a"), `"reason"`, `"origin_facility_name":"Puskesmas Gambir","destination_facility_name":"RSUD Pasar Rebo","reason"`, 1)
	if w := postScore(h, "n-1", ok); w.Code != http.StatusOK {
		t.Fatalf("names are accepted: %d %s", w.Code, w.Body)
	}
	if item, _ := h.Store.Get("n-1"); item.Request.OriginFacilityName != "Puskesmas Gambir" || item.Request.DestinationFacilityName != "RSUD Pasar Rebo" {
		t.Fatalf("names must be stored next to the ids: %+v", item.Request)
	}
	bad := strings.Replace(scoreBody("d-1", "I10", "a"), `"reason"`, `"origin_facility_name":"a‮b","reason"`, 1)
	if w := postScore(h, "n-2", bad); w.Code != http.StatusBadRequest {
		t.Fatalf("a name with a bidi control character must be refused, got %d", w.Code)
	}
}
