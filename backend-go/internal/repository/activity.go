package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// ActivityWindow is how many of the newest entries a read looks at. Every entry is kept; the window only bounds a
// read (Firestore answers 300 per page, and filtering by field would need an index per combination).
// shortcut: filters see the newest ActivityWindow entries only, upgrade to indexed queries when older ones must be searchable.
const ActivityWindow = 1000

// ActivityStore keeps the user activity log. Recent answers newest first.
type ActivityStore interface {
	Append(ctx context.Context, e domain.Activity) error
	Recent(ctx context.Context, n int) ([]domain.Activity, error)
}

// MemoryActivity is for local development and tests; it keeps the newest memoryActivityCap entries.
type MemoryActivity struct {
	mu   sync.Mutex
	list []domain.Activity // oldest first
}

const memoryActivityCap = 5000

func (m *MemoryActivity) Append(_ context.Context, e domain.Activity) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.list = append(m.list, e)
	if len(m.list) > memoryActivityCap {
		m.list = m.list[len(m.list)-memoryActivityCap:]
	}
	return nil
}

func (m *MemoryActivity) Recent(_ context.Context, n int) ([]domain.Activity, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]domain.Activity, 0, min(n, len(m.list)))
	for i := len(m.list) - 1; i >= 0 && len(out) < n; i-- {
		out = append(out, m.list[i])
	}
	return out, nil
}

// FirestoreActivity stores one document per entry in the activity collection: the entry as JSON plus its time, which
// the collection is ordered by.
type FirestoreActivity struct{ firestoreREST }

func NewFirestoreActivity(project string, token func(context.Context) (string, error)) FirestoreActivity {
	return FirestoreActivity{newFirestoreREST(project, token)}
}

const activityCollection = "activity"

func (f FirestoreActivity) Append(ctx context.Context, e domain.Activity) error {
	raw, _ := json.Marshal(e)
	body, _ := json.Marshal(fsDoc{Fields: map[string]fsString{"at": {e.At}, "json": {string(raw)}}})
	resp, err := f.do(ctx, http.MethodPatch, f.collection(activityCollection)+"/"+url.PathEscape(e.ID), body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("firestore status %d", resp.StatusCode)
	}
	return nil
}

func (f FirestoreActivity) Recent(ctx context.Context, n int) ([]domain.Activity, error) {
	out := make([]domain.Activity, 0, n)
	token := ""
	for len(out) < n {
		u := fmt.Sprintf("%s?orderBy=%s&pageSize=%d", f.collection(activityCollection), url.QueryEscape("at desc"), min(n-len(out), 300))
		if token != "" {
			u += "&pageToken=" + url.QueryEscape(token)
		}
		resp, err := f.do(ctx, http.MethodGet, u, nil)
		if err != nil {
			return nil, err
		}
		var body struct {
			Documents     []fsDoc `json:"documents"`
			NextPageToken string  `json:"nextPageToken"`
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("firestore status %d", resp.StatusCode)
		}
		err = json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		for _, d := range body.Documents {
			var e domain.Activity
			if json.Unmarshal([]byte(d.Fields["json"].S), &e) != nil {
				return nil, fmt.Errorf("corrupt activity document")
			}
			out = append(out, e)
		}
		if body.NextPageToken == "" {
			break
		}
		token = body.NextPageToken
	}
	return out, nil
}

// ActivityWriter takes entries off the request path: Record never blocks, a worker saves them. Every entry is also
// printed as a log line first, so a full queue, a Firestore outage or a crash still leaves the trail in the platform logs.
type ActivityWriter struct {
	store  ActivityStore
	queue  chan domain.Activity
	done   chan struct{}
	mu     sync.RWMutex // Record holds it shared, Close exclusive: nothing is sent on the closed queue
	closed bool
}

func NewActivityWriter(store ActivityStore) *ActivityWriter {
	w := &ActivityWriter{store: store, queue: make(chan domain.Activity, 1024), done: make(chan struct{})}
	go w.run()
	return w
}

func (w *ActivityWriter) Record(e domain.Activity) {
	line, _ := json.Marshal(e)
	log.Printf(`{"event":"activity","entry":%s}`, line)
	w.mu.RLock()
	defer w.mu.RUnlock()
	if w.closed {
		return
	}
	select {
	case w.queue <- e:
	default:
		log.Printf(`{"event":"activity_dropped","id":%q}`, e.ID) // the log line above is all that remains of it
	}
}

func (w *ActivityWriter) run() {
	defer close(w.done)
	for e := range w.queue {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := w.store.Append(ctx, e); err != nil {
			log.Printf(`{"event":"activity_save_failed","id":%q}`, e.ID)
		}
		cancel()
	}
}

// Close stops taking entries and waits until the saved ones are written; call it on shutdown, after the server stopped.
func (w *ActivityWriter) Close() {
	w.mu.Lock()
	w.closed = true
	w.mu.Unlock()
	close(w.queue)
	<-w.done
}

var (
	_ ActivityStore = (*MemoryActivity)(nil)
	_ ActivityStore = FirestoreActivity{}
)
