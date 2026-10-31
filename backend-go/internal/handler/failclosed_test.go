package handler

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// downFirestore loads fine at startup and then refuses every write, like Firestore going away mid-run.
type downFirestore struct{}

func (downFirestore) Load(context.Context, string) (domain.StoredReferral, error) {
	return domain.StoredReferral{}, errors.New("firestore down")
}
func (downFirestore) Save(context.Context, domain.StoredReferral) (string, error) {
	return "", errors.New("firestore down")
}
func (downFirestore) LoadAll(context.Context) ([]domain.StoredReferral, error) { return nil, nil }
func (downFirestore) ChangedSince(context.Context, time.Time) ([]domain.StoredReferral, error) {
	return nil, errors.New("firestore down")
}

// Firestore fail-closed (QA 30 Oct, cyber security P1): while the database refuses writes, no human decision may be
// acknowledged, and nothing may look saved on this instance either.
func TestHumanDecisionsFailClosedWhenFirestoreIsDown(t *testing.T) {
	h, store := crudHandler(fixedML{score: 10})
	if err := store.UsePersister(context.Background(), downFirestore{}); err != nil {
		t.Fatal(err)
	}
	before, _ := store.Get("r-1")
	for name, c := range map[string]struct {
		code int
		run  func() int
	}{
		"final audit":   {http.StatusServiceUnavailable, func() int { return doAs(roleVerifikator, h.Audit, "POST", "", validAudit).Code }},
		"clarification": {http.StatusServiceUnavailable, func() int { return doAs(roleTKMKB, h.Clarify, "POST", "r-1", `{"author":"X","text":"jawab"}`).Code }},
		"archive":       {http.StatusServiceUnavailable, func() int { return doAs(roleTKMKB, h.Archive, "DELETE", "r-1", `{"reviewer":"X","note":"arsip"}`).Code }},
	} {
		if got := c.run(); got != c.code {
			t.Errorf("%s with Firestore down: got %d, want %d", name, got, c.code)
		}
	}
	after, _ := store.Get("r-1")
	if len(after.Audits) != len(before.Audits) || len(after.Clarifications) != len(before.Clarifications) || after.Archived || after.Final {
		t.Fatalf("an unsaved decision became visible: %+v", after)
	}
	if w := doAs(roleTKMKB, h.Update, "PUT", "r-1", editBody); w.Code < 400 {
		t.Errorf("an edit with Firestore down must not report success, got %d", w.Code)
	}
	if item, _ := store.Get("r-1"); item.Request.DiagnosisCode != before.Request.DiagnosisCode {
		t.Errorf("an unsaved edit became visible: %s", item.Request.DiagnosisCode)
	}
}
