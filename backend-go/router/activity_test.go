package router

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/handler"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

// syncSink saves at once, so a test can read the log right after the request.
type syncSink struct{ s *repository.MemoryActivity }

func (k syncSink) Record(e domain.Activity) { _ = k.s.Append(context.Background(), e) }

func activityRouter(t *testing.T) (http.Handler, *repository.MemoryActivity) {
	t.Helper()
	hash, _ := service.HashPassword("sandi-baru-67890")
	users := repository.NewMemoryUsers("")
	for _, u := range []domain.User{
		{Email: "tkmkb@x.id", Role: "tkmkb", Hash: hash}, {Email: "ver@x.id", Role: "verifikator", Hash: hash},
		{Email: "dok@x.id", Role: "dokter", Hash: hash, DoctorID: "d-1"},
	} {
		_ = users.Put(context.Background(), u)
	}
	store := repository.NewMemoryStore()
	req := domain.ReferralRequest{ReferralID: "r-1", DoctorID: "d-1", PatientName: "Bambang Sutrisno", OriginFacilityID: "f-1", DiagnosisCode: "J06.9", Reason: "alat", IssuedAt: time.Now()}
	store.Upsert(req, domain.RiskDecision{ReferralID: "r-1", Score: 10, Decision: "yellow", Status: "SCORED"})
	mem := &repository.MemoryActivity{}
	h := handler.ReferralHandler{Users: users, Store: store, ActivityStore: mem, ActivitySink: syncSink{mem},
		Decisions: service.DecisionService{Dummy: true}}
	return New(h, handler.AuthHandler{Auth: service.Authenticator{Users: users}}, token, "http://localhost:3000"), mem
}

func as(email, role string) map[string]string {
	return map[string]string{"Authorization": "Bearer " + token, "X-Session": sid, "X-Actor": email, "X-Actor-Role": role, "Content-Type": "application/json"}
}

func send(h http.Handler, method, path, body string, hdr map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	for k, v := range hdr {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func logOf(t *testing.T, h http.Handler, who map[string]string, query string) (items []domain.Activity, next string) {
	t.Helper()
	w := send(h, "GET", "/api/v1/activity"+query, "", who)
	if w.Code != http.StatusOK {
		t.Fatalf("activity %s: %d %s", query, w.Code, w.Body)
	}
	var out struct {
		Items []domain.Activity `json:"items"`
		Next  string            `json:"next"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out.Items, out.Next
}

func TestEveryActionIsLoggedWithWhoWhatWhichAndOutcome(t *testing.T) {
	h, mem := activityRouter(t)
	tk, ver, dok := as("tkmkb@x.id", "tkmkb"), as("ver@x.id", "verifikator"), as("dok@x.id", "dokter")

	send(h, "GET", "/api/v1/referrals", "", ver)                                                                            // list
	send(h, "GET", "/api/v1/referrals/r-1", "", dok)                                                                        // read
	send(h, "PUT", "/api/v1/referrals/r-1", `{"diagnosis_code":"D12","reason":"klinis","clinical_narrative":"batuk"}`, ver) // update (dummy scoring: 200)
	send(h, "POST", "/api/v1/referrals/r-1/clarifications", `{"author":"dr. A","text":"sudah"}`, dok)                       // create clarification
	send(h, "POST", "/api/v1/audits", `{"referral_id":"r-1","reviewer":"Siti","outcome":"valid","note":"ok"}`, dok)         // dokter may not: denied
	send(h, "DELETE", "/api/v1/referrals/r-1", archiveBody, ver)                                                            // verifikator may not archive: denied
	send(h, "DELETE", "/api/v1/referrals/r-1", archiveBody, tk)                                                             // delete
	send(h, "GET", "/api/v1/referrals/nope", "", tk)                                                                        // read of nothing: 404
	send(h, "POST", "/api/v1/auth/verify", `{"email":"ver@x.id","password":"sandi-baru-67890"}`, bearerOnly())              // login ok
	send(h, "POST", "/api/v1/auth/verify", `{"email":"ver@x.id","password":"salah-salah-123"}`, bearerOnly())               // login failed
	// Not logged: polling, reference data, a refused gate, and reading the log itself.
	send(h, "GET", "/api/v1/auth/session", "", tk)
	send(h, "GET", "/api/v1/stats", "", tk)
	send(h, "GET", "/api/v1/referrals", "", map[string]string{"Authorization": "Bearer wrong"})
	send(h, "GET", "/api/v1/activity", "", tk)

	type row struct {
		actor, role, resource, action, id, outcome string
		status                                     int
	}
	want := []row{
		{"", "", "session", "login", "", "denied", 401},
		{"ver@x.id", "verifikator", "session", "login", "", "ok", 200},
		{"tkmkb@x.id", "tkmkb", "referral", "read", "nope", "rejected", 404},
		{"tkmkb@x.id", "tkmkb", "referral", "delete", "r-1", "ok", 204},
		{"ver@x.id", "verifikator", "referral", "delete", "r-1", "denied", 403},
		{"dok@x.id", "dokter", "audit", "create", "", "denied", 403},
		{"dok@x.id", "dokter", "clarification", "create", "r-1", "ok", 201},
		{"ver@x.id", "verifikator", "referral", "update", "r-1", "ok", 200},
		{"dok@x.id", "dokter", "referral", "read", "r-1", "ok", 200},
		{"ver@x.id", "verifikator", "referral", "list", "", "ok", 200},
	}
	got, _ := mem.Recent(context.Background(), 100)
	if len(got) != len(want) {
		t.Fatalf("want %d entries, got %d: %+v", len(want), len(got), got)
	}
	for i, w := range want {
		g := got[i]
		if (row{g.Actor, g.Role, g.Resource, g.Action, g.ResourceID, g.Outcome, g.Status}) != w {
			t.Errorf("entry %d: got %+v, want %+v", i, g, w)
		}
		if g.ID == "" || g.At == "" {
			t.Errorf("entry %d has no id or time: %+v", i, g)
		}
	}
	if d := got[7].Detail; strings.Join(d, ",") != "referral_updated,clinical_narrative,diagnosis_code,reason" {
		t.Errorf("an update logs which fields changed, by name: %v", d)
	}
	if raw, _ := json.Marshal(got); strings.Contains(string(raw), "Bambang") || strings.Contains(string(raw), "batuk") || strings.Contains(string(raw), "salah-salah") {
		t.Fatalf("the log must hold no patient text or password: %s", raw)
	}
}

const archiveBody = `{"reviewer":"Siti","note":"duplikat"}`

func bearerOnly() map[string]string {
	return map[string]string{"Authorization": "Bearer " + token, "Content-Type": "application/json"}
}

func TestOnlyTKMKBReadsEveryonesActivityAndOthersReadTheirOwn(t *testing.T) {
	h, _ := activityRouter(t)
	tk, ver, dok := as("tkmkb@x.id", "tkmkb"), as("ver@x.id", "verifikator"), as("dok@x.id", "dokter")
	send(h, "GET", "/api/v1/referrals", "", ver)
	send(h, "GET", "/api/v1/referrals/r-1", "", dok)
	send(h, "GET", "/api/v1/referrals/r-1", "", dok)

	if all, _ := logOf(t, h, tk, ""); len(all) != 3 {
		t.Fatalf("TKMKB sees all 3, got %d", len(all))
	}
	if one, _ := logOf(t, h, tk, "?actor=ver@x.id"); len(one) != 1 || one[0].Action != "list" {
		t.Fatalf("TKMKB filters by actor: %+v", one)
	}
	// A doctor asking for someone else's entries still gets only their own.
	own, _ := logOf(t, h, dok, "?actor=ver@x.id")
	if len(own) != 2 || own[0].Actor != "dok@x.id" || own[1].Actor != "dok@x.id" {
		t.Fatalf("a doctor sees own entries only: %+v", own)
	}
	if by, _ := logOf(t, h, tk, "?resource=referral&action=read&referral_id=r-1&outcome=ok"); len(by) != 2 {
		t.Fatalf("combined filters: %+v", by)
	}
}

func TestActivityPagesNewestFirstAndNeverSkipEntriesInTheSameMillisecond(t *testing.T) {
	h, mem := activityRouter(t)
	at := time.Now().UTC().Format(domain.OrderedTime)
	for _, id := range []string{"a1", "a2", "a3", "a4", "a5"} { // five entries sharing one timestamp
		_ = mem.Append(context.Background(), domain.Activity{ID: id, At: at, Actor: "tkmkb@x.id", Role: "tkmkb", Action: "read", Resource: "referral", Outcome: "ok", Status: 200})
	}
	tk := as("tkmkb@x.id", "tkmkb")
	var seen []string
	cursor := ""
	for pages := 0; pages < 10; pages++ {
		q := "?limit=2"
		if cursor != "" {
			q += "&cursor=" + strings.ReplaceAll(cursor, "|", "%7C")
		}
		items, next := logOf(t, h, tk, q)
		for _, e := range items {
			seen = append(seen, e.ID)
		}
		if next == "" {
			break
		}
		cursor = next
	}
	if strings.Join(seen, ",") != "a5,a4,a3,a2,a1" {
		t.Fatalf("every entry exactly once, newest first: %v", seen)
	}
}

func TestActivityRejectsBadQueriesAndUnknownCallers(t *testing.T) {
	h, _ := activityRouter(t)
	tk := as("tkmkb@x.id", "tkmkb")
	for _, q := range []string{"?limit=0", "?limit=201", "?limit=x", "?cursor=nope", "?cursor=2026-01-01T00:00:00.000Z|", "?cursor=junk|a1"} {
		if w := send(h, "GET", "/api/v1/activity"+q, "", tk); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", q, w.Code)
		}
	}
	if w := send(h, "GET", "/api/v1/activity", "", bearerOnly()); w.Code != http.StatusForbidden {
		t.Errorf("a service call with no user must get 403, got %d", w.Code)
	}
}

func refuse(h http.Handler, body string, who map[string]string) *httptest.ResponseRecorder {
	return send(h, "POST", "/api/v1/activity/refusal", body, who)
}

func TestProxyRefusalsAreLoggedUnderTheVerifiedActorAndMarkedAsProxy(t *testing.T) {
	h, mem := activityRouter(t)
	ver, dok, tk := as("ver@x.id", "verifikator"), as("dok@x.id", "dokter"), as("tkmkb@x.id", "tkmkb")
	// A slice, not a map: the log is read back newest first, so the report order must be fixed.
	for _, c := range []struct {
		body string
		who  map[string]string
	}{
		{`{"resource":"audit","action":"create","resource_id":"r-1","status":403,"code":"FORBIDDEN_LEVEL"}`, ver},
		{`{"resource":"config","action":"update","status":403,"code":"FORBIDDEN_ROLE"}`, ver},
		{`{"resource":"referral","action":"read","resource_id":"r-1","status":400,"code":"INVALID_REQUEST"}`, dok},
	} {
		if w := refuse(h, c.body, c.who); w.Code != http.StatusNoContent || w.Body.Len() != 0 {
			t.Fatalf("%s: %d %s", c.body, w.Code, w.Body)
		}
	}
	got, _ := mem.Recent(context.Background(), 10)
	if len(got) != 3 {
		t.Fatalf("one entry per report, and the endpoint itself is not logged: %+v", got)
	}
	type row struct {
		actor, role, resource, action, id, outcome, source, detail string
		status                                                     int
	}
	want := []row{
		{"dok@x.id", "dokter", "referral", "read", "r-1", "rejected", "proxy", "INVALID_REQUEST", 400},
		{"ver@x.id", "verifikator", "config", "update", "", "denied", "proxy", "FORBIDDEN_ROLE", 403},
		{"ver@x.id", "verifikator", "audit", "create", "r-1", "denied", "proxy", "FORBIDDEN_LEVEL", 403},
	}
	for i, w := range want {
		g := got[i]
		if (row{g.Actor, g.Role, g.Resource, g.Action, g.ResourceID, g.Outcome, g.Source, strings.Join(g.Detail, ","), g.Status}) != w || g.ID == "" || g.At == "" {
			t.Errorf("entry %d: got %+v, want %+v", i, g, w)
		}
	}
	// They show up in the log like any other entry, and a doctor still sees only their own.
	if all, _ := logOf(t, h, tk, "?outcome=denied"); len(all) != 2 {
		t.Fatalf("TKMKB sees both denied refusals: %+v", all)
	}
	if own, _ := logOf(t, h, dok, ""); len(own) != 1 || own[0].Source != "proxy" {
		t.Fatalf("a doctor sees only their own report: %+v", own)
	}
	// Entries the backend records itself say so.
	send(h, "GET", "/api/v1/referrals", "", ver)
	if all, _ := logOf(t, h, ver, "?action=list"); len(all) != 1 || all[0].Source != "backend" {
		t.Fatalf("backend entries carry source backend: %+v", all)
	}
}

func TestProxyRefusalCannotNameTheActorOrCarryFreeText(t *testing.T) {
	h, mem := activityRouter(t)
	ver := as("ver@x.id", "verifikator")
	const ok = `"resource":"audit","action":"create","status":403,"code":"FORBIDDEN_LEVEL"`
	bad := map[string]string{
		"actor in the body":    `{` + ok + `,"actor":"tkmkb@x.id"}`,
		"role in the body":     `{` + ok + `,"role":"tkmkb"}`,
		"free text":            `{` + ok + `,"detail":"Bambang Sutrisno"}`,
		"unknown resource":     `{"resource":"patients","action":"create","status":403,"code":"X"}`,
		"unknown action":       `{"resource":"audit","action":"purge","status":403,"code":"X"}`,
		"status 200":           `{"resource":"audit","action":"create","status":200,"code":"X"}`,
		"status 500":           `{"resource":"audit","action":"create","status":500,"code":"X"}`,
		"code in lower case":   `{"resource":"audit","action":"create","status":403,"code":"forbidden"}`,
		"code with a sentence": `{"resource":"audit","action":"create","status":403,"code":"NOT ALLOWED FOR BAMBANG"}`,
		"code too long":        `{"resource":"audit","action":"create","status":403,"code":"` + strings.Repeat("A", 41) + `"}`,
		"id with spaces":       `{` + ok + `,"resource_id":"r 1"}`,
		"id too long":          `{` + ok + `,"resource_id":"` + strings.Repeat("a", 65) + `"}`,
		"not json":             `nope`,
		"empty":                ``,
	}
	for name, body := range bad {
		if w := refuse(h, body, ver); w.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", name, w.Code)
		}
	}
	if w := refuse(h, `{`+ok+`}`, bearerOnly()); w.Code != http.StatusForbidden {
		t.Errorf("no signed-in actor: want 403, got %d", w.Code)
	}
	if w := send(h, "POST", "/api/v1/activity/refusal", `{`+ok+`}`, map[string]string{"Content-Type": "application/json"}); w.Code != http.StatusUnauthorized {
		t.Errorf("no service token: want 401, got %d", w.Code)
	}
	if got, _ := mem.Recent(context.Background(), 10); len(got) != 0 {
		t.Fatalf("a refused report leaves nothing in the log: %+v", got)
	}
}
