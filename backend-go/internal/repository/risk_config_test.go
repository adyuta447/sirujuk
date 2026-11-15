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

func TestMemoryRiskConfigRoundTrip(t *testing.T) {
	m := &MemoryRiskConfig{}
	if _, found, _ := m.Load(context.Background()); found {
		t.Fatal("nothing saved yet")
	}
	cfg := domain.DefaultRiskConfig()
	cfg.Version = 3
	_ = m.Save(context.Background(), cfg)
	if got, found, _ := m.Load(context.Background()); !found || got.Version != 3 {
		t.Fatalf("lost: %+v %v", got, found)
	}
}

func fakeRiskConfigStore(t *testing.T, stored *string, status int) FirestoreRiskConfig {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/documents/config/risk") {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		switch r.Method {
		case http.MethodPatch:
			var d fsDoc
			raw, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(raw, &d)
			*stored = d.Fields["json"].S
			w.Write([]byte(`{}`))
		case http.MethodGet:
			if *stored == "" {
				http.NotFound(w, r)
				return
			}
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(fsDoc{Fields: map[string]fsString{"json": {*stored}}})
		}
	}))
	t.Cleanup(srv.Close)
	f := NewFirestoreRiskConfig("p", func(context.Context) (string, error) { return "tok", nil })
	f.BaseURL = srv.URL
	return f
}

func TestFirestoreRiskConfigRoundTripAndNotFound(t *testing.T) {
	var stored string
	f := fakeRiskConfigStore(t, &stored, http.StatusOK)
	if _, found, err := f.Load(context.Background()); found || err != nil {
		t.Fatalf("no document is not an error: %v %v", found, err)
	}
	cfg := domain.DefaultRiskConfig()
	cfg.YellowFrom, cfg.Version = 45, 2
	if err := f.Save(context.Background(), cfg); err != nil {
		t.Fatal(err)
	}
	if got, found, err := f.Load(context.Background()); err != nil || !found || got.YellowFrom != 45 || got.Version != 2 {
		t.Fatalf("round trip: %+v %v %v", got, found, err)
	}
}

func TestADamagedStoredConfigIsAnErrorNotADefault(t *testing.T) {
	stored := `{"yellow_from":90,"red_from":10,"actions":{}}`
	f := fakeRiskConfigStore(t, &stored, http.StatusOK)
	if _, found, err := f.Load(context.Background()); err == nil || found {
		t.Fatalf("an invalid document must fail loudly, not change every category: %v %v", found, err)
	}
}
