package repository

import (
	"context"
	"errors"
	"log"
	"slices"
	"sort"
	"sync"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// maxStored bounds memory: an authenticated caller must not be able to grow the process without limit.
const (
	maxStored         = 5000
	maxClarifications = 20 // per referral
	persistTimeout    = 2 * time.Second
)

var (
	ErrNotFound = errors.New("referral not found")
	ErrLimit    = errors.New("limit reached")
	// ErrStorage means the change was NOT applied because it could not be saved durably.
	ErrStorage = errors.New("storage unavailable")
)

// MemoryStore holds referrals in memory and, when a Persister is set, writes every change through to it first.
// shortcut: reads come from memory, so with several instances each only sees what it loaded at start plus its own
// writes; read from the database (or add a change feed) before scaling out. Writes hold the lock during the save.
type MemoryStore struct {
	mu      sync.RWMutex
	items   map[string]*domain.StoredReferral
	order   []string
	persist Persister
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{items: make(map[string]*domain.StoredReferral)}
}

// UsePersister loads the saved referrals and then writes all later changes through p.
func (s *MemoryStore) UsePersister(ctx context.Context, p Persister) error {
	saved, err := p.LoadAll(ctx)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range saved {
		item := saved[i]
		if _, exists := s.items[item.Request.ReferralID]; !exists {
			s.order = append(s.order, item.Request.ReferralID)
		}
		s.items[item.Request.ReferralID] = &item
	}
	s.persist = p
	return nil
}

func (s *MemoryStore) save(item domain.StoredReferral) error {
	if s.persist == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), persistTimeout)
	defer cancel()
	if err := s.persist.Save(ctx, item); err != nil {
		log.Printf(`{"event":"persist_failed","referral_id":%q}`, item.Request.ReferralID)
		return ErrStorage
	}
	return nil
}

// Upsert stores a score. It is on the patient path, so a failed save is logged and the in-memory copy still serves.
func (s *MemoryStore) Upsert(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.upsert(req, decision, false)
}

// UpsertSynthetic stores a demo row and marks it synthetic. Only the seed calls it.
func (s *MemoryStore) UpsertSynthetic(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.upsert(req, decision, true)
}

func (s *MemoryStore) upsert(req domain.ReferralRequest, decision domain.RiskDecision, synthetic bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, exists := s.items[req.ReferralID]
	if !exists {
		if len(s.items) >= maxStored {
			return
		}
		item = &domain.StoredReferral{}
		s.items[req.ReferralID] = item
		s.order = append(s.order, req.ReferralID)
	} else if prev := item.Decision; prev.Status == "SCORED" {
		item.History = append(item.History, domain.ScoreSnapshot{Score: prev.Score, Decision: prev.Decision, ModelVersion: prev.ModelVersion, ScoredAt: prev.ScoredAt})
		if len(item.History) > 20 {
			item.History = item.History[len(item.History)-20:]
		}
	}
	item.Request, item.Decision = req, decision
	item.Synthetic = item.Synthetic || synthetic
	_ = s.save(*item)
}

// mutate applies fn to a copy, saves it durably, and only then replaces the stored item: an audit or clarification
// is never acknowledged unless it is saved.
func (s *MemoryStore) mutate(id string, fn func(*domain.StoredReferral) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	current, ok := s.items[id]
	if !ok || current.Archived {
		return ErrNotFound
	}
	next := clone(*current)
	if err := fn(&next); err != nil {
		return err
	}
	if err := s.save(next); err != nil {
		return err
	}
	*current = next
	return nil
}

func (s *MemoryStore) AddAudit(id string, audit domain.AuditReview) error {
	return s.mutate(id, func(r *domain.StoredReferral) error {
		r.Audits = append(r.Audits, audit)
		return nil
	})
}

// Archive hides a referral from lists without destroying it: scores, history and audits stay for appeals.
func (s *MemoryStore) Archive(id string, audit domain.AuditReview) error {
	return s.mutate(id, func(r *domain.StoredReferral) error {
		r.Archived = true
		r.Audits = append(r.Audits, audit)
		return nil
	})
}

func (s *MemoryStore) AddClarification(id string, c domain.Clarification) error {
	return s.mutate(id, func(r *domain.StoredReferral) error {
		if len(r.Clarifications) >= maxClarifications {
			return ErrLimit
		}
		r.Clarifications = append(r.Clarifications, c)
		return nil
	})
}

// Get returns a copy with derived fields, so callers can encode it while writers append.
func (s *MemoryStore) Get(id string) (domain.StoredReferral, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.items[id]
	if !ok {
		return domain.StoredReferral{}, false
	}
	out := clone(*item)
	out.Derive()
	return out, true
}

// List returns non-archived referrals, highest score first.
func (s *MemoryStore) List() []domain.StoredReferral {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.StoredReferral, 0, len(s.order))
	for _, id := range s.order {
		if item := s.items[id]; !item.Archived {
			c := clone(*item)
			c.Derive()
			out = append(out, c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Decision.Score > out[j].Decision.Score })
	return out
}

func (s *MemoryStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.items)
}

func clone(r domain.StoredReferral) domain.StoredReferral {
	r.Audits = slices.Clone(r.Audits)
	r.History = slices.Clone(r.History)
	r.Clarifications = slices.Clone(r.Clarifications)
	return r
}
