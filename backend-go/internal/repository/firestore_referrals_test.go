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

// fakeFirestore keeps patched documents so tests can inspect exactly what would be stored.
func fakeFirestore(t *testing.T) (*httptest.Server, map[string][]byte) {
	t.Helper()
	docs := map[string][]byte{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPatch:
			b, _ := io.ReadAll(r.Body)
			docs[r.URL.Path] = b
			w.Write(b)
		case http.MethodGet:
			var list []json.RawMessage
			for _, b := range docs {
				list = append(list, b)
			}
			json.NewEncoder(w).Encode(map[string]any{"documents": list})
		}
	}))
	t.Cleanup(srv.Close)
	return srv, docs
}

func newFS(srvURL string, key []byte) FirestoreReferrals {
	f := NewFirestoreReferrals("p1", func(context.Context) (string, error) { return "tok", nil })
	f.BaseURL = srvURL
	if key != nil {
		f = f.WithKey(key)
	}
	return f
}

var testKey = []byte("0123456789abcdef0123456789abcdef")

func patient() domain.StoredReferral {
	return domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: "R-1", PatientName: "Bambang Sutrisno", ClinicalNarrative: "keluhan rahasia"}}
}

func TestPatientDataIsNotReadableInTheStoredDocument(t *testing.T) {
	srv, docs := fakeFirestore(t)
	f := newFS(srv.URL, testKey)
	if err := f.Save(context.Background(), patient()); err != nil {
		t.Fatal(err)
	}
	for _, raw := range docs {
		if strings.Contains(string(raw), "Bambang") || strings.Contains(string(raw), "rahasia") {
			t.Fatalf("plaintext patient data reached Firestore: %s", raw)
		}
	}
	got, err := f.LoadAll(context.Background())
	if err != nil || len(got) != 1 || got[0].Request.PatientName != "Bambang Sutrisno" {
		t.Fatalf("round trip failed: %+v err=%v", got, err)
	}
}

func TestEnablingEncryptionKeepsOldPlainDocumentsReadable(t *testing.T) {
	srv, _ := fakeFirestore(t)
	if err := newFS(srv.URL, nil).Save(context.Background(), patient()); err != nil {
		t.Fatal(err)
	}
	got, err := newFS(srv.URL, testKey).LoadAll(context.Background())
	if err != nil || len(got) != 1 {
		t.Fatalf("documents written before the key existed must still load: %v", err)
	}
}

func TestEncryptedDocumentWithoutKeyFailsLoudly(t *testing.T) {
	srv, _ := fakeFirestore(t)
	if err := newFS(srv.URL, testKey).Save(context.Background(), patient()); err != nil {
		t.Fatal(err)
	}
	if _, err := newFS(srv.URL, nil).LoadAll(context.Background()); err == nil {
		t.Fatal("a missing key must be an error, not an empty list that looks like no data")
	}
	wrong := []byte("ffffffffffffffffffffffffffffffff")
	if _, err := newFS(srv.URL, wrong).LoadAll(context.Background()); err == nil {
		t.Fatal("a wrong key must be an error")
	}
}
