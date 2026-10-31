package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

func serve(users repository.UserRepository, actor, role string) int {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	r := httptest.NewRequest("GET", "/", nil)
	if actor != "" {
		r.Header.Set("X-Actor", actor)
		r.Header.Set("X-Actor-Role", role)
	}
	w := httptest.NewRecorder()
	ActiveActor(users)(next).ServeHTTP(w, r)
	return w.Code
}

func TestActiveActorRefusesDisabledUnknownAndMismatchedRole(t *testing.T) {
	users := repository.NewMemoryUsers("")
	put := func(u domain.User) { _ = users.Put(context.Background(), u) }
	put(domain.User{Email: "ok@x.id", Role: "tkmkb"})
	put(domain.User{Email: "off@x.id", Role: "tkmkb", Disabled: true})
	put(domain.User{Email: "exp@x.id", Role: "tkmkb", ExpiresAt: "2020-01-01T00:00:00Z"})

	for name, c := range map[string]struct {
		actor, role string
		want        int
	}{
		"active":           {"ok@x.id", "tkmkb", http.StatusNoContent},
		"disabled":         {"off@x.id", "tkmkb", http.StatusForbidden},
		"unknown":          {"nobody@x.id", "tkmkb", http.StatusForbidden},
		"role was changed": {"ok@x.id", "verifikator", http.StatusForbidden},
		"service call":     {"", "", http.StatusNoContent},
		"malformed actor":  {"bad actor", "tkmkb", http.StatusForbidden},
	} {
		if got := serve(users, c.actor, c.role); got != c.want {
			t.Errorf("%s: want %d, got %d", name, c.want, got)
		}
	}
}

type brokenUsers struct{ repository.UserRepository }

func (brokenUsers) Find(context.Context, string) (domain.User, bool, error) {
	return domain.User{}, false, context.DeadlineExceeded
}

func TestActiveActorFailsClosedWhenAccountStoreIsDown(t *testing.T) {
	if got := serve(brokenUsers{}, "ok@x.id", "tkmkb"); got != http.StatusServiceUnavailable {
		t.Fatalf("want 503, got %d", got)
	}
}

func TestActorParsingRejectsMalformedHeaders(t *testing.T) {
	for name, c := range map[string]struct{ sub, role string }{
		"space in email": {"a b@x.id", "tkmkb"},
		"injection":      {"a@x.id\"}", "tkmkb"},
		"unknown role":   {"a@x.id", "admin"},
		"empty":          {"", ""},
	} {
		r := httptest.NewRequest("GET", "/", nil)
		r.Header.Set("X-Actor", c.sub)
		r.Header.Set("X-Actor-Role", c.role)
		if sub, role := Actor(r); sub != "" || role != "" {
			t.Errorf("%s: want empty actor, got %q %q", name, sub, role)
		}
	}
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Actor", "ok+tag@x.id")
	r.Header.Set("X-Actor-Role", "dokter")
	if sub, role := Actor(r); sub != "ok+tag@x.id" || role != "dokter" {
		t.Errorf("valid actor rejected: %q %q", sub, role)
	}
}
