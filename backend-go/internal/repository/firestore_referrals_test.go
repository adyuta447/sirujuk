package repository

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

func TestFirestoreReferralsRoundTripWithPaging(t *testing.T) {
	docs := map[string]fsDoc{} // doc path -> stored document
	clock := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		switch {
		case r.Method == http.MethodPatch:
			if strings.Contains(r.URL.Path, "/r/1") { // the raw id must never shape the path
				http.Error(w, "id leaked into path", http.StatusBadRequest)
				return
			}
			cur, exists := docs[r.URL.Path]
			q := r.URL.Query()
			if (q.Get("currentDocument.exists") == "false" && exists) || (q.Has("currentDocument.updateTime") && cur.UpdateTime != q.Get("currentDocument.updateTime")) {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(`{"error":{"code":400,"status":"FAILED_PRECONDITION"}}`))
				return
			}
			var d fsDoc
			_ = json.NewDecoder(r.Body).Decode(&d)
			clock++
			d.UpdateTime = time.Unix(int64(clock), 0).UTC().Format(time.RFC3339Nano)
			docs[r.URL.Path] = d
			json.NewEncoder(w).Encode(d)
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/documents:runQuery"):
			var body struct {
				StructuredQuery struct {
					Where struct {
						FieldFilter struct {
							Value fsString `json:"value"`
						} `json:"fieldFilter"`
					} `json:"where"`
				} `json:"structuredQuery"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			rows := []map[string]any{}
			for _, d := range docs {
				if d.Fields["updated"].S >= body.StructuredQuery.Where.FieldFilter.Value.S {
					rows = append(rows, map[string]any{"document": d})
				}
			}
			json.NewEncoder(w).Encode(append(rows, map[string]any{"readTime": "x"}))
		case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/referrals"):
			var list []fsDoc
			for _, d := range docs {
				list = append(list, d)
			}
			if r.URL.Query().Get("pageToken") == "" { // serve one doc per page
				json.NewEncoder(w).Encode(map[string]any{"documents": list[:1], "nextPageToken": "p2"})
				return
			}
			json.NewEncoder(w).Encode(map[string]any{"documents": list[1:]})
		case r.Method == http.MethodGet:
			d, ok := docs[r.URL.Path]
			if !ok {
				http.Error(w, "{}", http.StatusNotFound)
				return
			}
			json.NewEncoder(w).Encode(d)
		}
	}))
	defer srv.Close()

	f := NewFirestoreReferrals("p1", func(context.Context) (string, error) { return "tok", nil }, nil)
	f.BaseURL = srv.URL
	ctx := context.Background()
	before := time.Now()
	for _, id := range []string{"r/1", "r-2"} {
		if _, err := f.Save(ctx, domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: id}}); err != nil {
			t.Fatal(err)
		}
	}
	got, err := f.LoadAll(ctx)
	if err != nil || len(got) != 2 || got[0].Version == "" {
		t.Fatalf("paging lost documents or versions: %+v err=%v", got, err)
	}

	r1, err := f.Load(ctx, "r/1")
	if err != nil || r1.Version == "" {
		t.Fatalf("load: %+v %v", r1, err)
	}
	if _, err := f.Save(ctx, domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: "r/1"}}); !errors.Is(err, ErrConflict) {
		t.Fatalf("creating an existing referral: want ErrConflict, got %v", err)
	}
	if _, err := f.Save(ctx, r1); err != nil {
		t.Fatalf("save on the current version: %v", err)
	}
	if _, err := f.Save(ctx, r1); !errors.Is(err, ErrConflict) {
		t.Fatalf("save on a stale version: want ErrConflict, got %v", err)
	}
	if _, err := f.Load(ctx, "nope"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing referral: want ErrNotFound, got %v", err)
	}

	if changed, err := f.ChangedSince(ctx, before); err != nil || len(changed) != 2 {
		t.Fatalf("changed since start: %d err=%v", len(changed), err)
	}
	if changed, err := f.ChangedSince(ctx, time.Now().Add(time.Hour)); err != nil || len(changed) != 0 {
		t.Fatalf("nothing changed in the future: %d err=%v", len(changed), err)
	}
}

func TestFirestoreReferralsSaveErrorSurfaces(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { http.Error(w, "no", http.StatusForbidden) }))
	defer srv.Close()
	f := NewFirestoreReferrals("p1", func(context.Context) (string, error) { return "tok", nil }, nil)
	f.BaseURL = srv.URL
	if _, err := f.Save(context.Background(), domain.StoredReferral{}); err == nil {
		t.Fatal("a 403 must be an error so the audit is not acknowledged")
	}
}

func TestFirestoreReferralsEncryptAtRest(t *testing.T) {
	docs := map[string]fsDoc{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			var d fsDoc
			_ = json.NewDecoder(r.Body).Decode(&d)
			d.UpdateTime = "v1"
			docs[r.URL.Path] = d
		}
		d, ok := docs[r.URL.Path]
		if !ok {
			http.Error(w, "{}", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(d)
	}))
	defer srv.Close()
	tok := func(context.Context) (string, error) { return "tok", nil }
	key := []byte(strings.Repeat("k", 32))
	f := NewFirestoreReferrals("p1", tok, key)
	f.BaseURL = srv.URL
	ctx := context.Background()
	item := domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: "R1", PatientName: "Budi Santoso", ClinicalNarrative: "nyeri dada"}}
	if _, err := f.Save(ctx, item); err != nil {
		t.Fatal(err)
	}
	stored, _ := json.Marshal(docs)
	if strings.Contains(string(stored), "Budi") || strings.Contains(string(stored), "nyeri") || !strings.Contains(string(stored), "json_enc") {
		t.Fatalf("patient data reached the database unsealed: %s", stored)
	}
	got, err := f.Load(ctx, "R1")
	if err != nil || got.Request.PatientName != "Budi Santoso" {
		t.Fatalf("sealed round trip: %+v %v", got, err)
	}
	plain := NewFirestoreReferrals("p1", tok, nil)
	plain.BaseURL = srv.URL
	if _, err := plain.Load(ctx, "R1"); err == nil {
		t.Fatal("a sealed document must not load without the key")
	}

	// A document saved before the key existed still loads, and its next save seals it.
	if _, err := plain.Save(ctx, domain.StoredReferral{Request: domain.ReferralRequest{ReferralID: "OLD", PatientName: "Siti"}}); err != nil {
		t.Fatal(err)
	}
	old, err := f.Load(ctx, "OLD")
	if err != nil || old.Request.PatientName != "Siti" {
		t.Fatalf("legacy plaintext document: %+v %v", old, err)
	}

	// A sealed blob copied onto another referral's document is rejected.
	r1, old1 := f.doc("R1")[len(srv.URL):], f.doc("OLD")[len(srv.URL):]
	moved := docs[old1]
	moved.Fields = map[string]fsString{"id": {"OLD"}, "json_enc": docs[r1].Fields["json_enc"]}
	docs[old1] = moved
	if _, err := f.Load(ctx, "OLD"); err == nil {
		t.Fatal("a blob from another referral must not load")
	}
}
