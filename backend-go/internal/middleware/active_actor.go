package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/sirujuk/backend-go/internal/repository"
)

const activeTTL = 30 * time.Second

type activeEntry struct {
	role      string
	active    bool
	checkedAt time.Time
}

// ActiveActor re-checks the account behind X-Actor on every request, so a disabled account or a changed role takes
// effect within activeTTL instead of at the end of the 8-hour session. Requests with no X-Actor (service calls such
// as login verification) pass through; a present but unknown, disabled, mismatched or unverifiable actor is refused,
// and a lookup failure refuses too (fail closed).
func ActiveActor(users repository.UserRepository) func(http.Handler) http.Handler {
	var mu sync.Mutex
	cache := map[string]activeEntry{}

	lookup := func(r *http.Request, sub string) (activeEntry, error) {
		mu.Lock()
		e, ok := cache[sub]
		mu.Unlock()
		if ok && time.Since(e.checkedAt) < activeTTL {
			return e, nil
		}
		u, found, err := users.Find(r.Context(), sub)
		if err != nil {
			return activeEntry{}, err
		}
		e = activeEntry{role: u.Role, active: found && !u.Disabled && !u.Expired(time.Now()), checkedAt: time.Now()}
		mu.Lock()
		if len(cache) > 1000 {
			clear(cache)
		}
		cache[sub] = e
		mu.Unlock()
		return e, nil
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("X-Actor") == "" && r.Header.Get("X-Actor-Role") == "" {
				next.ServeHTTP(w, r)
				return
			}
			sub, role := Actor(r)
			if sub == "" {
				deny(w, http.StatusForbidden, "ACCOUNT_INACTIVE")
				return
			}
			e, err := lookup(r, sub)
			switch {
			case err != nil:
				deny(w, http.StatusServiceUnavailable, "AUTH_UNAVAILABLE")
			case !e.active || e.role != role:
				deny(w, http.StatusForbidden, "ACCOUNT_INACTIVE")
			default:
				next.ServeHTTP(w, r)
			}
		})
	}
}

func deny(w http.ResponseWriter, status int, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"code":"` + code + `","message":"Account is not active for this role","correlation_id":""}`))
}
