package repository

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirujuk/backend-go/domain"
)

func TestFirestoreUsersRoundTrip(t *testing.T) {
	var stored []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" || !strings.Contains(r.URL.Path, "/projects/p1/databases/(default)/documents/users/") {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if strings.Contains(r.URL.Path, "@") {
			http.Error(w, "email must not appear in the document id", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodPatch:
			stored, _ = io.ReadAll(r.Body)
			w.Write(stored)
		case http.MethodGet:
			if stored == nil {
				http.NotFound(w, r)
				return
			}
			w.Write(stored)
		}
	}))
	defer srv.Close()
	f := NewFirestoreUsers("p1", func(context.Context) (string, error) { return "tok", nil })
	f.BaseURL = srv.URL

	ctx := context.Background()
	if _, found, err := f.Find(ctx, "A@Uji.id"); found || err != nil {
		t.Fatalf("missing account must be (not found, no error), got found=%v err=%v", found, err)
	}
	want := domain.User{Email: "a@uji.id", Nama: "A", Role: "tkmkb", Hash: "scrypt:00:00"}
	if err := f.Put(ctx, domain.User{Email: "A@Uji.id", Nama: "A", Role: "tkmkb", Hash: "scrypt:00:00"}); err != nil {
		t.Fatal(err)
	}
	var d fsDoc
	if err := json.Unmarshal(stored, &d); err != nil || d.Fields["email"].S != "a@uji.id" {
		t.Fatalf("email must be stored lower-cased: %s", stored)
	}
	if got, found, err := f.Find(ctx, "a@uji.id"); err != nil || !found || got != want {
		t.Fatalf("got %+v found=%v err=%v", got, found, err)
	}
}

func TestFirestoreUsersErrorIsNotNotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { http.Error(w, "boom", http.StatusForbidden) }))
	defer srv.Close()
	f := NewFirestoreUsers("p1", func(context.Context) (string, error) { return "tok", nil })
	f.BaseURL = srv.URL
	if _, found, err := f.Find(context.Background(), "a@uji.id"); found || err == nil {
		t.Fatal("a 403 must surface as an error so login says 'unavailable', not 'wrong password'")
	}
}
