package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

var ok = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

func code(h http.Handler, headers map[string]string) int {
	r := httptest.NewRequest("GET", "/", nil)
	for k, v := range headers {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w.Code
}

func TestAuthRequiresTheExactBearerToken(t *testing.T) {
	h := Auth("secret-token")(ok)
	for name, c := range map[string]struct {
		header string
		want   int
	}{
		"exact":       {"Bearer secret-token", http.StatusNoContent},
		"missing":     {"", http.StatusUnauthorized},
		"wrong":       {"Bearer secret-tokeN", http.StatusUnauthorized},
		"no scheme":   {"secret-token", http.StatusUnauthorized},
		"prefix only": {"Bearer secret", http.StatusUnauthorized},
		"longer":      {"Bearer secret-token-extra", http.StatusUnauthorized},
	} {
		hdr := map[string]string{}
		if c.header != "" {
			hdr["Authorization"] = c.header
		}
		if got := code(h, hdr); got != c.want {
			t.Errorf("%s: want %d, got %d", name, c.want, got)
		}
	}
}

func TestAuthWithoutConfiguredTokenPassesThroughForLocalRuns(t *testing.T) {
	if got := code(Auth("")(ok), nil); got != http.StatusNoContent {
		t.Fatalf("no token configured means local development, got %d", got)
	}
}

func TestSecureHeadersOnEveryResponse(t *testing.T) {
	w := httptest.NewRecorder()
	SecureHeaders(ok).ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	for k, want := range map[string]string{"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"} {
		if got := w.Header().Get(k); got != want {
			t.Errorf("%s: want %q, got %q", k, want, got)
		}
	}
	if w.Header().Get("Content-Security-Policy") == "" {
		t.Error("API responses should carry a restrictive CSP")
	}
}

func TestCORSPreflightAndOriginMatching(t *testing.T) {
	h := CORS("https://app.example")(ok)
	pre := httptest.NewRecorder()
	r := httptest.NewRequest("OPTIONS", "/", nil)
	r.Header.Set("Origin", "https://app.example")
	h.ServeHTTP(pre, r)
	if pre.Code != http.StatusNoContent || pre.Header().Get("Access-Control-Allow-Origin") != "https://app.example" {
		t.Fatalf("allowed preflight: %d %v", pre.Code, pre.Header())
	}
	for _, origin := range []string{"https://app.example.evil.com", "http://app.example", "null", ""} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil)
		if origin != "" {
			r.Header.Set("Origin", origin)
		}
		h.ServeHTTP(w, r)
		if w.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Errorf("origin %q must not be allowed", origin)
		}
	}
}
