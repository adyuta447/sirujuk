package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// fakePersister mimics Firestore: versions are update times, and a save on a stale version is refused.
type fakePersister struct {
	saved   map[string]domain.StoredReferral
	updated map[string]time.Time
	clock   int64
	fail    bool
}

func newFakePersister() *fakePersister {
	return &fakePersister{saved: map[string]domain.StoredReferral{}, updated: map[string]time.Time{}}
}

func (f *fakePersister) Save(_ context.Context, item domain.StoredReferral) (string, error) {
	if f.fail {
		return "", errors.New("db down")
	}
	id := item.Request.ReferralID
	if cur, ok := f.saved[id]; ok != (item.Version != "") || (ok && cur.Version != item.Version) {
		return "", ErrConflict
	}
	f.clock++
	item.Version = time.Unix(0, f.clock).UTC().Format(time.RFC3339Nano)
	f.saved[id], f.updated[id] = item, time.Now()
	return item.Version, nil
}

func (f *fakePersister) Load(_ context.Context, id string) (domain.StoredReferral, error) {
	item, ok := f.saved[id]
	if !ok {
		return item, ErrNotFound
	}
	return item, nil
}

func (f *fakePersister) LoadAll(context.Context) ([]domain.StoredReferral, error) {
	out := make([]domain.StoredReferral, 0, len(f.saved))
	for _, v := range f.saved {
		out = append(out, v)
	}
	return out, nil
}

func (f *fakePersister) ChangedSince(_ context.Context, since time.Time) ([]domain.StoredReferral, error) {
	var out []domain.StoredReferral
	for id, v := range f.saved {
		if !f.updated[id].Before(since) {
			out = append(out, v)
		}
	}
	return out, nil
}

func newReq(id string) domain.ReferralRequest {
	return domain.ReferralRequest{ReferralID: id, DoctorID: "d", IssuedAt: time.Now()}
}

func TestAuditIsNotAcknowledgedUnlessSaved(t *testing.T) {
	p := newFakePersister()
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
	p := newFakePersister()
	a := NewMemoryStore()
	_ = a.UsePersister(context.Background(), p)
	a.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Status: "SCORED"})
	_ = a.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeInvalid, Role: "tkmkb"})
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
	p := newFakePersister()
	p.fail = true
	s := NewMemoryStore()
	_ = s.UsePersister(context.Background(), p)
	s.Upsert(newReq("r1"), domain.RiskDecision{Status: "SCORED"}) // patient path: never blocked by storage
	if _, ok := s.Get("r1"); !ok {
		t.Fatal("score must stay available in memory")
	}
}

// Two instances (S12): B's copy is stale when it writes, so its save is refused, retried on the newer copy, and
// neither A's audit nor B's clarification is lost.
func TestTwoInstancesDoNotOverwriteEachOther(t *testing.T) {
	p := newFakePersister()
	a, b := NewMemoryStore(), NewMemoryStore()
	_ = a.UsePersister(context.Background(), p)
	a.Upsert(newReq("r1"), domain.RiskDecision{Decision: "red", Status: "SCORED"})
	_ = b.UsePersister(context.Background(), p)

	if err := a.AddAudit("r1", domain.AuditReview{Outcome: domain.OutcomeClarification}); err != nil {
		t.Fatal(err)
	}
	if err := b.AddClarification("r1", domain.Clarification{Author: "dr", Text: "alat rusak"}); err != nil {
		t.Fatal(err)
	}
	b.Upsert(newReq("r1"), domain.RiskDecision{Decision: "yellow", Status: "SCORED"}) // a re-score on B
	got := p.saved["r1"]
	if len(got.Audits) != 1 || len(got.Clarifications) != 1 || len(got.History) != 1 || got.Decision.Decision != "yellow" {
		t.Fatalf("a write was lost: %+v", got)
	}

	if err := a.Sync(context.Background()); err != nil {
		t.Fatal(err)
	}
	if item, _ := a.Get("r1"); len(item.Clarifications) != 1 || item.Decision.Decision != "yellow" {
		t.Fatalf("sync did not bring B's changes to A: %+v", item)
	}
}

func TestReferralCreatedOnAnotherInstanceIsFound(t *testing.T) {
	p := newFakePersister()
	a, b := NewMemoryStore(), NewMemoryStore()
	_ = a.UsePersister(context.Background(), p)
	_ = b.UsePersister(context.Background(), p)
	a.Upsert(newReq("r2"), domain.RiskDecision{Decision: "red", Status: "SCORED"})
	if _, ok := b.Get("r2"); !ok {
		t.Fatal("detail on B must find a referral A just created")
	}
	if err := b.AddAudit("r3", domain.AuditReview{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unknown referral: want ErrNotFound, got %v", err)
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
			r.Audits = append(r.Audits, domain.AuditReview{Outcome: o, Role: "tkmkb"})
		}
		r.Derive()
		if r.ClaimStatus != c.claim || r.Final != c.final {
			t.Errorf("%s: got %s/%v, want %s/%v", name, r.ClaimStatus, r.Final, c.claim, c.final)
		}
	}
}
