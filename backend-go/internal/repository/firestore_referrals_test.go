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

func TestFirestoreReferralsRoundTripWithPaging(t *testing.T) {
	docs := map[string]string{} // doc id -> stored json string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		switch r.Method {
		case http.MethodPatch:
			if strings.Contains(r.URL.Path, "/r/1") { // the raw id must never shape the path
				http.Error(w, "id leaked into path", http.StatusBadRequest)
				return
			}
			b, _ := io.ReadAll(r.Body)
			var d fsDoc
			_ = json.Unmarshal(b, &d)
			docs[r.URL.Path] = d.Fields["json"].S
			w.Write(b)
		case http.MethodGet:
			var list []fsDoc
			for _, j := range docs {
				list = append(list, fsDoc{Fields: map[string]fsString{"json": {j}}})
			}
			if r.URL.Query().Get("pageToken") == "" { // serve one doc per page
				json.NewEncoder(w).Encode(map[string]any{"documents": list[:1], "nextPageToken": "p2"})
				return
			}
			json.NewEncoder(w).Encode(map[string]any{"documents": list[1:]})
		}
	}))
	defer srv.Close()

	f := NewFirestoreReferrals("p1", func(context.Context) (string, error) { return "tok", nil })
	f.BaseURL = srv.URL
	ctx := context.Background()
	for _, id := range []string{"r/1", "r-2"} {
		if err := f.Save(ctx, domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: id}}); err != nil {
			t.Fatal(err)
		}
	}
	got, err := f.LoadAll(ctx)
	if err != nil || len(got) != 2 {
		t.Fatalf("paging lost documents: %d err=%v", len(got), err)
	}
}

func TestFirestoreReferralsSaveErrorSurfaces(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { http.Error(w, "no", http.StatusForbidden) }))
	defer srv.Close()
	f := NewFirestoreReferrals("p1", func(context.Context) (string, error) { return "tok", nil })
	f.BaseURL = srv.URL
	if err := f.Save(context.Background(), domain.StoredReferral{}); err == nil {
		t.Fatal("a 403 must be an error so the audit is not acknowledged")
	}
}
