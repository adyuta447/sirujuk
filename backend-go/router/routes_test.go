package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/handler"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

const token = "0123456789abcdef0123456789abcdef"

func testRouter(t *testing.T) http.Handler {
	t.Helper()
	users := repository.NewMemoryUsers("")
	_ = users.Put(context.Background(), domain.User{Email: "tkmkb@x.id", Role: "tkmkb"})
	_ = users.Put(context.Background(), domain.User{Email: "off@x.id", Role: "tkmkb", Disabled: true})
	h := handler.ReferralHandler{Users: users, Ready: func(context.Context) map[string]string { return map[string]string{"redis": "down"} }}
	return New(h, handler.AuthHandler{Auth: service.Authenticator{Users: users}}, token, "http://localhost:3000")
}

func do(h http.Handler, method, path string, headers map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(""))
	for k, v := range headers {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func bearer() map[string]string { return map[string]string{"Authorization": "Bearer " + token} }

func TestHealthAndReadyNeedNoToken(t *testing.T) {
	h := testRouter(t)
	for _, p := range []string{"/health", "/ready"} {
		if w := do(h, "GET", p, nil); w.Code != http.StatusOK {
			t.Errorf("%s: want 200, got %d", p, w.Code)
		}
	}
	if w := do(h, "GET", "/ready", nil); !strings.Contains(w.Body.String(), `"redis":"down"`) {
		t.Errorf("ready must report dependency state: %s", w.Body)
	}
}

func TestApiNeedsTheServiceToken(t *testing.T) {
	h := testRouter(t)
	if w := do(h, "GET", "/api/v1/referrals", nil); w.Code != http.StatusUnauthorized {
		t.Fatalf("no token: want 401, got %d", w.Code)
	}
	if w := do(h, "GET", "/api/v1/referrals", map[string]string{"Authorization": "Bearer wrong"}); w.Code != http.StatusUnauthorized {
		t.Fatalf("wrong token: want 401, got %d", w.Code)
	}
	if w := do(h, "GET", "/api/v1/referrals", bearer()); w.Code != http.StatusOK {
		t.Fatalf("valid token: want 200, got %d", w.Code)
	}
}

func TestTokenIsCheckedBeforeTheActor(t *testing.T) {
	// An unauthenticated caller must learn nothing about which accounts exist.
	h := testRouter(t)
	w := do(h, "GET", "/api/v1/referrals", map[string]string{"X-Actor": "off@x.id", "X-Actor-Role": "tkmkb"})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401 before any account lookup, got %d", w.Code)
	}
}

func TestInactiveOrMismatchedActorIsRefused(t *testing.T) {
	h := testRouter(t)
	for name, hdr := range map[string]map[string]string{
		"disabled":    {"X-Actor": "off@x.id", "X-Actor-Role": "tkmkb"},
		"unknown":     {"X-Actor": "nobody@x.id", "X-Actor-Role": "tkmkb"},
		"forged role": {"X-Actor": "tkmkb@x.id", "X-Actor-Role": "verifikator"},
	} {
		hdr["Authorization"] = "Bearer " + token
		if w := do(h, "GET", "/api/v1/referrals", hdr); w.Code != http.StatusForbidden {
			t.Errorf("%s: want 403, got %d", name, w.Code)
		}
	}
	good := map[string]string{"Authorization": "Bearer " + token, "X-Actor": "tkmkb@x.id", "X-Actor-Role": "tkmkb"}
	if w := do(h, "GET", "/api/v1/referrals", good); w.Code != http.StatusOK {
		t.Errorf("active actor: want 200, got %d", w.Code)
	}
}

func TestEveryResponseIsUncachedAndSniffProof(t *testing.T) {
	w := do(testRouter(t), "GET", "/health", nil)
	if w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("health data must not be cached or sniffed: %v", w.Header())
	}
}

func TestCORSAllowsOnlyTheDashboardOrigin(t *testing.T) {
	h := testRouter(t)
	ok := do(h, "OPTIONS", "/api/v1/referrals", map[string]string{"Origin": "http://localhost:3000"})
	if ok.Code != http.StatusNoContent || ok.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Fatalf("preflight from the dashboard: %d %v", ok.Code, ok.Header())
	}
	other := do(h, "GET", "/health", map[string]string{"Origin": "https://evil.example"})
	if other.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("another origin must get no CORS header")
	}
}

func TestOldRoutesAreGone(t *testing.T) {
	// No unauthenticated way to reach scoring or accounts.
	h := testRouter(t)
	for _, c := range [][2]string{{"POST", "/api/v1/referrals/score"}, {"POST", "/api/v1/auth/verify"}, {"POST", "/api/v1/audits"}} {
		if w := do(h, c[0], c[1], nil); w.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without token: want 401, got %d", c[0], c[1], w.Code)
		}
	}
}
