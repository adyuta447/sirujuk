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
	maxClarifications = 20                      // per referral
	persistTimeout    = 4 * time.Second         // a strict change may need several read and write rounds under contention
	bestEffortTimeout = 1500 * time.Millisecond // the patient path must not wait long for storage
)

var (
	ErrNotFound = errors.New("referral not found")
	ErrLimit    = errors.New("limit reached")
	// ErrStorage means the change was NOT applied because it could not be saved durably.
	ErrStorage = errors.New("storage unavailable")
)

// MemoryStore serves reads from memory and, when a Persister is set, writes every change through to the database.
//
// Several instances may run at once (Cloud Run scales out), so a write never trusts this instance's copy: it reads the
// freshest document, applies the change on top, and saves with a version check. If another instance wrote in between,
// it reads again and re-applies, so audits and clarifications from different instances cannot overwrite each other.
// Reads are eventually consistent: Sync refreshes the in-memory copy every few seconds, so a change made on another
// instance shows up here after at most one interval. Writes hold the lock while talking to the database.
type MemoryStore struct {
	mu      sync.RWMutex
	items   map[string]*domain.StoredReferral
	order   []string
	persist Persister
}

// casAttempts bounds how often one change retries after losing a race to another instance.
const casAttempts = 4

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
	s.merge(saved)
	s.persist = p
	return nil
}

// merge makes the persisted documents authoritative; items that only exist here (a save that failed) are kept.
func (s *MemoryStore) merge(saved []domain.StoredReferral) {
	for i := range saved {
		item := saved[i]
		id := item.Request.ReferralID
		if _, exists := s.items[id]; !exists {
			s.order = append(s.order, id)
		}
		s.items[id] = &item
	}
}

// Sync reloads the persisted referrals every interval until ctx ends, so changes from other instances become visible.
// It reads every document, which Firestore bills per read: keep the interval at tens of seconds, not seconds.
func (s *MemoryStore) Sync(ctx context.Context, every time.Duration) {
	if s.persist == nil || every <= 0 {
		return
	}
	tick := time.NewTicker(every)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			lctx, cancel := context.WithTimeout(ctx, 10*time.Second)
			saved, err := s.persist.LoadAll(lctx)
			cancel()
			if err != nil {
				log.Printf(`{"event":"store_sync_failed"}`)
				continue
			}
			s.mu.Lock()
			s.merge(saved)
			s.mu.Unlock()
		}
	}
}

// freshest returns the newest copy of a referral and its version: the database copy when there is one, else the local
// one (a referral whose first save failed), else nil. Must be called with s.mu held.
func (s *MemoryStore) freshest(ctx context.Context, id string) (*domain.StoredReferral, string, error) {
	if s.persist != nil {
		item, version, found, err := s.persist.Load(ctx, id)
		if err != nil {
			return nil, "", err
		}
		if found {
			return &item, version, nil
		}
	}
	if local, ok := s.items[id]; ok {
		c := clone(*local)
		return &c, "", nil
	}
	return nil, "", nil
}

// change applies fn to the freshest copy of a referral and stores the result. create allows making a new referral.
// bestEffort is for the patient path: if the database cannot be reached the change still lands in memory (and
// ErrStorage is returned for logging); otherwise an unsaved change is not applied at all.
func (s *MemoryStore) change(id string, create, bestEffort bool, fn func(*domain.StoredReferral) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	timeout := persistTimeout
	if bestEffort {
		timeout = bestEffortTimeout
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	for attempt := 0; attempt < casAttempts; attempt++ {
		base, version, err := s.freshest(ctx, id)
		if err != nil {
			return s.storageFailed(id, err)
		}
		var next domain.StoredReferral
		switch {
		case base != nil:
			next = clone(*base)
		case !create:
			return ErrNotFound
		case len(s.items) >= maxStored:
			return ErrLimit
		}
		if err := fn(&next); err != nil {
			return err
		}
		if s.persist != nil {
			switch err := s.persist.Save(ctx, next, version); {
			case errors.Is(err, ErrConflict):
				continue // another instance wrote first: read again and re-apply
			case err != nil:
				if !bestEffort {
					return s.storageFailed(id, err)
				}
				s.place(id, next)
				return s.storageFailed(id, err)
			}
		}
		s.place(id, next)
		return nil
	}
	return s.storageFailed(id, ErrConflict)
}

func (s *MemoryStore) storageFailed(id string, cause error) error {
	log.Printf(`{"event":"persist_failed","referral_id":%q,"cause":%q}`, id, cause.Error())
	return ErrStorage
}

func (s *MemoryStore) place(id string, item domain.StoredReferral) {
	if _, exists := s.items[id]; !exists {
		s.order = append(s.order, id)
	}
	s.items[id] = &item
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
	_ = s.change(req.ReferralID, true, true, func(r *domain.StoredReferral) error {
		if prev := r.Decision; r.Request.ReferralID != "" && prev.Status == "SCORED" { // an existing referral: keep the old score
			r.History = append(r.History, domain.ScoreSnapshot{Score: prev.Score, Decision: prev.Decision, ModelVersion: prev.ModelVersion, ScoredAt: prev.ScoredAt})
			if len(r.History) > 20 {
				r.History = r.History[len(r.History)-20:]
			}
		}
		r.Request, r.Decision = req, decision
		r.Synthetic = r.Synthetic || synthetic
		return nil
	})
}

// mutate changes an existing, non archived referral. An audit or clarification is never acknowledged unless it is saved.
func (s *MemoryStore) mutate(id string, fn func(*domain.StoredReferral) error) error {
	return s.change(id, false, false, func(r *domain.StoredReferral) error {
		if r.Archived {
			return ErrNotFound
		}
		return fn(r)
	})
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
