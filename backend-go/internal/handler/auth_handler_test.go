package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
	"github.com/sirujuk/backend-go/internal/service"
)

type downUsers struct{ repository.UserRepository }

func (downUsers) Find(context.Context, string) (domain.User, bool, error) {
	return domain.User{}, false, errors.New("firestore down")
}

func verify(h AuthHandler, body, contentType string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("POST", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", contentType)
	rec := httptest.NewRecorder()
	h.Verify(rec, req)
	return rec
}

func TestVerifyHandler(t *testing.T) {
	hash, _ := service.HashPassword("sandi-baru-67890")
	users := repository.NewMemoryUsers("")
	_ = users.Put(context.Background(), domain.User{Email: "a@uji.id", Nama: "Anita", Role: "verifikator", Hash: hash})
	h := AuthHandler{Auth: service.Authenticator{Users: users}}
	const j = "application/json"

	ok := verify(h, `{"email":"a@uji.id","password":"sandi-baru-67890"}`, j)
	if ok.Code != http.StatusOK || !strings.Contains(ok.Body.String(), `"nama":"Anita"`) || strings.Contains(ok.Body.String(), "scrypt") {
		t.Fatalf("good login must return the profile and never the hash: %d %s", ok.Code, ok.Body)
	}
	wrong := verify(h, `{"email":"a@uji.id","password":"salah-salah-123"}`, j)
	unknown := verify(h, `{"email":"x@uji.id","password":"sandi-baru-67890"}`, j)
	if wrong.Code != http.StatusUnauthorized || wrong.Body.String() != unknown.Body.String() {
		t.Fatalf("wrong password and unknown email must be indistinguishable: %d %q vs %d %q", wrong.Code, wrong.Body, unknown.Code, unknown.Body)
	}
	for name, c := range map[string]struct {
		body, contentType string
		want              int
	}{
		"unknown field":   {`{"email":"a@uji.id","password":"x","admin":true}`, j, http.StatusBadRequest},
		"empty password":  {`{"email":"a@uji.id","password":""}`, j, http.StatusBadRequest},
		"huge password":   {`{"email":"a@uji.id","password":"` + strings.Repeat("a", 300) + `"}`, j, http.StatusBadRequest},
		"control in mail": {`{"email":"a\u0000@uji.id","password":"x"}`, j, http.StatusBadRequest},
		"not json":        {`email=a`, "text/plain", http.StatusUnsupportedMediaType},
	} {
		if got := verify(h, c.body, c.contentType).Code; got != c.want {
			t.Errorf("%s: got %d, want %d", name, got, c.want)
		}
	}
	down := verify(AuthHandler{Auth: service.Authenticator{Users: downUsers{}}}, `{"email":"a@uji.id","password":"sandi-baru-67890"}`, j)
	if down.Code != http.StatusServiceUnavailable {
		t.Fatalf("store failure must be 503, not 401: %d", down.Code)
	}
}

type countLimiter struct{ n int64 }

func (l *countLimiter) Hit(context.Context, string, time.Duration) (int64, error) {
	l.n++
	return l.n, nil
}

func TestVerifyThrottlesPerEmail(t *testing.T) {
	h := AuthHandler{Auth: service.Authenticator{Users: repository.NewMemoryUsers("")}, Limiter: &countLimiter{}}
	for i := 1; i <= maxLoginTries; i++ {
		if rec := verify(h, `{"email":"a@uji.id","password":"salah-salah-123"}`, "application/json"); rec.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: want 401, got %d", i, rec.Code)
		}
	}
	rec := verify(h, `{"email":"a@uji.id","password":"salah-salah-123"}`, "application/json")
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("attempt over the limit must be 429 with Retry-After: %d", rec.Code)
	}
}

type keyLimiter map[string]int64

func (l keyLimiter) Hit(_ context.Context, key string, _ time.Duration) (int64, error) {
	l[key]++
	return l[key], nil
}

func TestVerifyBlocksTheGuesserNotTheAccountOwner(t *testing.T) {
	h := AuthHandler{Auth: service.Authenticator{Users: repository.NewMemoryUsers("")}, Limiter: keyLimiter{}}
	from := func(ip, email string) int {
		req := httptest.NewRequest("POST", "/", strings.NewReader(`{"email":"`+email+`","password":"salah-salah-123"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Client-IP", ip)
		rec := httptest.NewRecorder()
		h.Verify(rec, req)
		return rec.Code
	}
	for i := 0; i < maxLoginTries; i++ {
		from("203.0.113.9", "korban@uji.id")
	}
	if c := from("203.0.113.9", "korban@uji.id"); c != http.StatusTooManyRequests {
		t.Fatalf("the guessing IP must be blocked for this account, got %d", c)
	}
	if c := from("198.51.100.7", "korban@uji.id"); c != http.StatusUnauthorized {
		t.Fatalf("the owner from another IP must still reach the password check, got %d", c)
	}
	// triesUntilBlocked counts the attempts that went through before the first 429.
	triesUntilBlocked := func(next func(i int) (ip, email string)) int {
		for i := 0; i < 1000; i++ {
			if from(next(i)) == http.StatusTooManyRequests {
				return i
			}
		}
		return -1
	}
	if n := triesUntilBlocked(func(i int) (string, string) { return "203.0.113.50", fmt.Sprintf("u%d@uji.id", i) }); n != maxIPTries {
		t.Fatalf("one IP spraying many accounts must stop after %d tries, stopped after %d", maxIPTries, n)
	}
	if n := triesUntilBlocked(func(i int) (string, string) { return fmt.Sprintf("192.0.2.%d", i/5), "target@uji.id" }); n != maxAccountTries {
		t.Fatalf("many IPs guessing one account must stop after %d tries, stopped after %d", maxAccountTries, n)
	}
}
