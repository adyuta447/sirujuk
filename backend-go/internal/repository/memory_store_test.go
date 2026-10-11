package repository

import (
	"context"
	"errors"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// fakePersister is a versioned database that several MemoryStores can share, like instances sharing Firestore.
type fakePersister struct {
	mu        sync.Mutex
	saved     map[string]domain.StoredReferral
	version   map[string]int
	fail      bool
	conflicts int // the next N conditional saves report a conflict, as if another instance had just written
	loads     int
}

func newFake() *fakePersister {
	return &fakePersister{saved: map[string]domain.StoredReferral{}, version: map[string]int{}}
}

func (f *fakePersister) Load(_ context.Context, id string) (domain.StoredReferral, string, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.loads++
	if f.fail {
		return domain.StoredReferral{}, "", false, errors.New("db down")
	}
	item, ok := f.saved[id]
	if !ok {
		return domain.StoredReferral{}, "", false, nil
	}
	return clone(item), strconv.Itoa(f.version[id]), true, nil
}

func (f *fakePersister) Save(_ context.Context, item domain.StoredReferral, version string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.fail {
		return errors.New("db down")
	}
	id := item.Request.ReferralID
	current, exists := f.version[id]
	if f.conflicts > 0 {
		f.conflicts--
		f.version[id] = current + 1 // someone else's write moved the version
		return ErrConflict
	}
	if (version == "" && exists) || (version != "" && (!exists || version != strconv.Itoa(current))) {
		return ErrConflict
	}
	f.saved[id] = clone(item)
	f.version[id] = current + 1
	return nil
}

func (f *fakePersister) LoadAll(context.Context) ([]domain.StoredReferral, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.fail {
		return nil, errors.New("db down")
	}
	out := make([]domain.StoredReferral, 0, len(f.saved))
	for _, v := range f.saved {
		out = append(out, clone(v))
	}
	return out, nil
}

func newReq(id string) domain.ReferralRequest {
	return domain.ReferralRequest{ReferralID: id, DoctorID: "d", IssuedAt: time.Now()}
}

func TestAuditIsNotAcknowledgedUnlessSaved(t *testing.T) {
	p := newFake()
	s := NewMemoryStore()
	if err := s.UsePersister(context.Background(), p); err != nil {
		t.Fatal(err)
	}
	s.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Status: "SCORED"})

	p.fail = true
	if err := s.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeValid}); !errors.Is(err, ErrStorage) {
		t.Fatalf("want ErrStorage, got %v", err)
	}
	if item, _ := s.Get("r1"); len(item.Audits) != 0 || item.Final {
		t.Fatalf("an unsaved audit must not be visible: %+v", item)
	}

	p.fail = false
	if err := s.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeValid, Role: "tkmkb"}); err != nil {
		t.Fatal(err)
	}
	if len(p.saved["r1"].Audits) != 1 {
		t.Fatal("audit must be in the database before it is acknowledged")
	}
}

func TestRestartRestoresReferralsAndAudits(t *testing.T) {
	p := newFake()
	a := NewMemoryStore()
	_ = a.UsePersister(context.Background(), p)
	a.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Status: "SCORED"})
	_ = a.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeInvalid})
	_ = a.AddClarification("r1", domain.Clarification{Author: "dr", Text: "alat rusak"})

	b := NewMemoryStore() // a new instance after a restart
	if err := b.UsePersister(context.Background(), p); err != nil {
		t.Fatal(err)
	}
	item, ok := b.Get("r1")
	if !ok || len(item.Audits) != 1 || len(item.Clarifications) != 1 || item.ClaimStatus != domain.ClaimConfirmed {
		t.Fatalf("state lost across restart: %+v", item)
	}
}

func TestScoreStillServedWhenSaveFails(t *testing.T) {
	p := newFake()
	p.fail = true
	s := NewMemoryStore()
	_ = s.UsePersister(context.Background(), p)
	s.Upsert(newReq("r1"), domain.RiskDecision{Status: "SCORED"}) // patient path: never blocked by storage
	if _, ok := s.Get("r1"); !ok {
		t.Fatal("score must stay available in memory")
	}
}

func TestDeriveClaimStatus(t *testing.T) {
	cases := map[string]struct {
		decision string
		audits   []string
		claim    string
		final    bool
	}{
		"green is normal":        {"green", []string{domain.OutcomeInvalid}, domain.ClaimNormal, true},
		"red without decision":   {"red", nil, domain.ClaimHeld, false},
		"red clarification only": {"red", []string{domain.OutcomeClarification}, domain.ClaimHeld, false},
		"red valid releases":     {"red", []string{domain.OutcomeValid}, domain.ClaimReleased, true},
		"red invalid confirmed":  {"red", []string{domain.OutcomeInvalid}, domain.ClaimConfirmed, true},
		"red latest final wins":  {"red", []string{domain.OutcomeInvalid, domain.OutcomeValid}, domain.ClaimReleased, true},
	}
	for name, c := range cases {
		r := domain.StoredReferral{Decision: domain.RiskDecision{Decision: c.decision}}
		for _, o := range c.audits {
			r.Audits = append(r.Audits, domain.AuditReview{Outcome: o})
		}
		r.Derive()
		if r.ClaimStatus != c.claim || r.Final != c.final {
			t.Errorf("%s: got %s/%v, want %s/%v", name, r.ClaimStatus, r.Final, c.claim, c.final)
		}
	}
}

// instance returns a store that shares the database, like a second Cloud Run instance.
func instance(t *testing.T, p *fakePersister) *MemoryStore {
	t.Helper()
	s := NewMemoryStore()
	if err := s.UsePersister(context.Background(), p); err != nil {
		t.Fatal(err)
	}
	return s
}

func TestTwoInstancesDoNotOverwriteEachOthersAudits(t *testing.T) {
	db := newFake()
	a, b := instance(t, db), instance(t, db)
	a.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Status: "SCORED"})
	// b was loaded before r1 existed and has never seen it.
	if err := a.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeClarification, Reviewer: "A"}); err != nil {
		t.Fatal(err)
	}
	if err := b.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeInvalid, Reviewer: "B"}); err != nil {
		t.Fatalf("a stale instance must still be able to write: %v", err)
	}
	got, _ := db.saved["r1"], 0
	if len(got.Audits) != 2 || got.Audits[0].Reviewer != "A" || got.Audits[1].Reviewer != "B" {
		t.Fatalf("both audits must survive in the database: %+v", got.Audits)
	}
	if item, _ := b.Get("r1"); len(item.Audits) != 2 || item.ClaimStatus != domain.ClaimConfirmed {
		t.Fatalf("the writing instance must now see the merged state: %+v", item)
	}
}

func TestReScoreOnAnotherInstanceKeepsAuditsAndClarifications(t *testing.T) {
	db := newFake()
	a, b := instance(t, db), instance(t, db)
	a.Upsert(newReq("r1"), domain.RiskDecision{Decision: "yellow", Score: 5, Status: "SCORED"})
	_ = a.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeClarification})
	_ = a.AddClarification("r1", domain.Clarification{Author: "dr", Text: "alat rusak"})

	b.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Score: 90, Status: "SCORED"}) // b has a stale or empty copy
	saved := db.saved["r1"]
	if len(saved.Audits) != 1 || len(saved.Clarifications) != 1 || len(saved.History) != 1 || saved.Decision.Score != 90 {
		t.Fatalf("a re-score must keep other instances' audits and clarifications and archive the old score: %+v", saved)
	}
}

func TestLosingTheRaceRetriesOnTopOfTheNewVersion(t *testing.T) {
	db := newFake()
	s := instance(t, db)
	s.Upsert(newReq("r1"), domain.RiskDecision{Status: "SCORED"})
	db.conflicts = 2 // two other writers get in first
	if err := s.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeValid}); err != nil {
		t.Fatalf("a change must retry after a conflict: %v", err)
	}
	if len(db.saved["r1"].Audits) != 1 {
		t.Fatal("the audit must be saved exactly once")
	}
}

func TestEndlessConflictFailsLoudlyAndAppliesNothing(t *testing.T) {
	db := newFake()
	s := instance(t, db)
	s.Upsert(newReq("r1"), domain.RiskDecision{Status: "SCORED"})
	db.conflicts = 100
	if err := s.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeValid}); !errors.Is(err, ErrStorage) {
		t.Fatalf("want ErrStorage, got %v", err)
	}
	if item, _ := s.Get("r1"); len(item.Audits) != 0 {
		t.Fatal("an audit that could not be saved must not be visible")
	}
}

func TestSyncMakesAnotherInstancesChangeVisible(t *testing.T) {
	db := newFake()
	a, b := instance(t, db), instance(t, db)
	a.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Status: "SCORED"})
	_ = a.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeValid, Role: "tkmkb"})
	if _, ok := b.Get("r1"); ok {
		t.Fatal("before the sync b knows nothing about r1")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go b.Sync(ctx, 20*time.Millisecond)
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if item, ok := b.Get("r1"); ok && item.Final {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("the other instance's decision never became visible")
}

func TestTwoInstancesCreatingTheSameReferralMerge(t *testing.T) {
	db := newFake()
	a, b := instance(t, db), instance(t, db)
	a.Upsert(newReq("r1"), domain.RiskDecision{Status: "SCORED", Score: 1})
	b.Upsert(newReq("r1"), domain.RiskDecision{Status: "SCORED", Score: 2}) // b never saw it, the create-only write conflicts and retries
	saved := db.saved["r1"]
	if saved.Decision.Score != 2 || len(saved.History) != 1 || saved.History[0].Score != 1 {
		t.Fatalf("second writer wins the score and the first score goes to history: %+v", saved)
	}
}
