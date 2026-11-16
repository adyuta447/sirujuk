package repository

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

func entry(i int) domain.Activity {
	return domain.Activity{ID: "e" + strconv.Itoa(i), At: "2026-11-16T10:00:00." + strconv.Itoa(100+i) + "Z", Actor: "a@x.id", Action: "read", Resource: "referral", Outcome: "ok", Status: 200}
}

func TestMemoryActivityReturnsNewestFirstAndKeepsTheNewestWhenFull(t *testing.T) {
	m := &MemoryActivity{}
	for i := 0; i < memoryActivityCap+10; i++ {
		_ = m.Append(context.Background(), entry(i))
	}
	got, _ := m.Recent(context.Background(), 3)
	if len(got) != 3 || got[0].ID != "e"+strconv.Itoa(memoryActivityCap+9) || got[2].ID != "e"+strconv.Itoa(memoryActivityCap+7) {
		t.Fatalf("newest first: %+v", got)
	}
	if all, _ := m.Recent(context.Background(), 1<<20); len(all) != memoryActivityCap {
		t.Fatalf("cap %d, got %d", memoryActivityCap, len(all))
	}
}

func TestFirestoreActivityWritesOneDocPerEntryAndReadsPagesNewestFirst(t *testing.T) {
	var mu sync.Mutex
	saved := map[string]string{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		switch r.Method {
		case http.MethodPatch:
			var d fsDoc
			_ = json.NewDecoder(r.Body).Decode(&d)
			saved[r.URL.Path] = d.Fields["json"].S
			if d.Fields["at"].S == "" {
				t.Errorf("the document needs its time to be ordered by")
			}
			w.Write([]byte(`{}`))
		case http.MethodGet:
			if r.URL.Query().Get("orderBy") != "at desc" {
				t.Errorf("orderBy = %q", r.URL.Query().Get("orderBy"))
			}
			docs := []fsDoc{}
			if r.URL.Query().Get("pageToken") == "" {
				for _, i := range []int{3, 2} {
					raw, _ := json.Marshal(entry(i))
					docs = append(docs, fsDoc{Fields: map[string]fsString{"json": {string(raw)}}})
				}
				json.NewEncoder(w).Encode(map[string]any{"documents": docs, "nextPageToken": "p2"})
				return
			}
			raw, _ := json.Marshal(entry(1))
			json.NewEncoder(w).Encode(map[string]any{"documents": []fsDoc{{Fields: map[string]fsString{"json": {string(raw)}}}}})
		}
	}))
	defer srv.Close()
	f := NewFirestoreActivity("p", func(context.Context) (string, error) { return "t", nil })
	f.BaseURL = srv.URL

	if err := f.Append(context.Background(), entry(1)); err != nil {
		t.Fatal(err)
	}
	if len(saved) != 1 {
		t.Fatalf("one document per entry: %v", saved)
	}
	got, err := f.Recent(context.Background(), 10)
	if err != nil || len(got) != 3 || got[0].ID != "e3" || got[2].ID != "e1" {
		t.Fatalf("pages must join, newest first: %+v %v", got, err)
	}
	if two, _ := f.Recent(context.Background(), 2); len(two) != 2 {
		t.Fatalf("n bounds the answer: %d", len(two))
	}
}

func TestFirestoreActivityErrorsAreReportedNotHidden(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { http.Error(w, "no", http.StatusForbidden) }))
	defer srv.Close()
	f := NewFirestoreActivity("p", func(context.Context) (string, error) { return "t", nil })
	f.BaseURL = srv.URL
	if f.Append(context.Background(), entry(1)) == nil {
		t.Error("a refused write must be an error")
	}
	if _, err := f.Recent(context.Background(), 5); err == nil {
		t.Error("a refused read must be an error")
	}
}

// slowStore holds every write until released, to fill the writer's queue.
type slowStore struct {
	MemoryActivity
	gate chan struct{}
}

func (s *slowStore) Append(ctx context.Context, e domain.Activity) error {
	<-s.gate
	return s.MemoryActivity.Append(ctx, e)
}

func TestActivityWriterNeverBlocksSavesEverythingOnCloseAndIgnoresLateEntries(t *testing.T) {
	s := &slowStore{gate: make(chan struct{})}
	w := NewActivityWriter(s)
	done := make(chan struct{})
	go func() {
		for i := 0; i < 1024+50; i++ { // more than the queue holds while the store is stuck
			w.Record(entry(i))
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("Record blocked on a slow store")
	}
	close(s.gate)
	w.Close()
	got, _ := s.Recent(context.Background(), 5000)
	if len(got) < 1024 { // the overflow past the queue is dropped (and logged); everything queued is saved
		t.Fatalf("queued entries must be saved before Close returns, got %d", len(got))
	}
	w.Record(entry(9999)) // after Close: must not panic
}
