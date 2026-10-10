package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

type fakePersister struct {
	saved map[string]domain.StoredReferral
	fail  bool
}

func (f *fakePersister) Save(_ context.Context, item domain.StoredReferral) error {
	if f.fail {
		return errors.New("db down")
	}
	f.saved[item.Request.ReferralID] = item
	return nil
}

func (f *fakePersister) LoadAll(context.Context) ([]domain.StoredReferral, error) {
	out := make([]domain.StoredReferral, 0, len(f.saved))
	for _, v := range f.saved {
		out = append(out, v)
	}
	return out, nil
}

func newReq(id string) domain.ReferralRequest {
	return domain.ReferralRequest{ReferralID: id, DoctorID: "d", IssuedAt: time.Now()}
}

func TestAuditIsNotAcknowledgedUnlessSaved(t *testing.T) {
	p := &fakePersister{saved: map[string]domain.StoredReferral{}}
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
	p := &fakePersister{saved: map[string]domain.StoredReferral{}}
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
	p := &fakePersister{saved: map[string]domain.StoredReferral{}, fail: true}
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
