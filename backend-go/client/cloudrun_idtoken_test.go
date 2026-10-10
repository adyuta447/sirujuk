package client

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCloudRunIDTokenCachesAndSendsAudience(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Header.Get("Metadata-Flavor") != "Google" || r.URL.Query().Get("audience") != "https://ml.run.app" {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		w.Write([]byte("tok\n"))
	}))
	defer srv.Close()
	metadataIDURL = srv.URL

	src := CloudRunIDToken("https://ml.run.app")
	for i := 0; i < 2; i++ {
		if tok, err := src(context.Background()); err != nil || tok != "tok" {
			t.Fatalf("got %q, %v", tok, err)
		}
	}
	if calls != 1 {
		t.Fatalf("token not cached: %d metadata calls", calls)
	}
}
