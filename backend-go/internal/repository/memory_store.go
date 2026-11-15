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
	// ErrExists means a referral with that number is already stored (Insert never overwrites).
	ErrExists = errors.New("referral already exists")
	ErrLimit  = errors.New("limit reached")
	// ErrFinal means the referral already has its final human decision; it can no longer be decided again, edited or re-scored.
	ErrFinal = errors.New("referral decision is final")
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
	return s.changeLocked(id, create, bestEffort, fn)
}

// changeLocked is change for a caller that already holds s.mu.
func (s *MemoryStore) changeLocked(id string, create, bestEffort bool, fn func(*domain.StoredReferral) error) error {
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

// Insert stores a brand new referral and never overwrites: if the number is taken, even by an archived referral or one
// written by another instance a moment ago, it returns the stored one with ErrExists. Scoring a new referral must go
// through here, so that a repeated or reused referral number cannot rewrite a referral that is already under review.
// Like Upsert it is on the patient path: if storage is down the referral is kept in memory and ErrStorage is logged.
func (s *MemoryStore) Insert(req domain.ReferralRequest, decision domain.RiskDecision) (domain.StoredReferral, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := s.changeLocked(req.ReferralID, true, true, func(r *domain.StoredReferral) error {
		if r.Request.ReferralID != "" { // the zero value means "being created"
			return ErrExists
		}
		r.Request, r.Decision = req, decision
		r.Hold()
		return nil
	})
	if errors.Is(err, ErrExists) {
		ctx, cancel := context.WithTimeout(context.Background(), bestEffortTimeout)
		defer cancel()
		if fresh, _, ferr := s.freshest(ctx, req.ReferralID); ferr == nil && fresh != nil {
			s.place(req.ReferralID, *fresh) // learn about it now, without waiting for the next sync
			return clone(*fresh), ErrExists
		}
		if local, ok := s.items[req.ReferralID]; ok {
			return clone(*local), ErrExists
		}
	}
	if errors.Is(err, ErrStorage) {
		return domain.StoredReferral{}, nil // kept in memory; already logged
	}
	return domain.StoredReferral{}, err
}

// Upsert stores a score. It is on the patient path, so a failed save is logged and the in-memory copy still serves.
func (s *MemoryStore) Upsert(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.upsert(req, decision, false, "")
}

// UpsertSample stores a row imported from a historical data sample (never a live referral) and records which one.
func (s *MemoryStore) UpsertSample(req domain.ReferralRequest, decision domain.RiskDecision, source string) {
	s.upsert(req, decision, false, source)
}

// UpsertSynthetic stores a demo row and marks it synthetic. Only the seed calls it.
func (s *MemoryStore) UpsertSynthetic(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.upsert(req, decision, true, "")
}

func (s *MemoryStore) upsert(req domain.ReferralRequest, decision domain.RiskDecision, synthetic bool, source string) {
	_ = s.change(req.ReferralID, true, true, func(r *domain.StoredReferral) error {
		keepHistory(r)
		r.Request, r.Decision = req, decision
		r.Hold()
		r.Synthetic = r.Synthetic || synthetic
		if source != "" {
			r.Source = source
		}
		return nil
	})
}

// keepHistory moves an existing referral's current score into History (newest 20).
func keepHistory(r *domain.StoredReferral) {
	if prev := r.Decision; r.Request.ReferralID != "" && prev.Status == "SCORED" {
		r.History = append(r.History, domain.ScoreSnapshot{Score: prev.Score, Decision: prev.Decision, ModelVersion: prev.ModelVersion, ScoredAt: prev.ScoredAt})
		if len(r.History) > 20 {
			r.History = r.History[len(r.History)-20:]
		}
	}
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

// AddAudit appends an audit. A second final outcome is refused: checked inside the write, so two reviewers racing
// (or on two instances) cannot both decide.
// shortcut: no appeal flow yet, so a final decision can only be reopened by hand; add one when TKMKB defines it.
func (s *MemoryStore) AddAudit(id string, audit domain.AuditReview) error {
	return s.mutate(id, func(r *domain.StoredReferral) error {
		if r.Derive(); r.Final && (audit.Outcome == domain.OutcomeValid || audit.Outcome == domain.OutcomeInvalid) {
			return ErrFinal
		}
		r.Audits = append(r.Audits, audit)
		return nil
	})
}

// Rescore replaces the request and score of a stored referral (an operator edit or re-score) and keeps the old score in
// History. Refused once the decision is final: changing the evidence after the verdict would leave the claim status
// pointing at a decision about other data.
func (s *MemoryStore) Rescore(req domain.ReferralRequest, decision domain.RiskDecision) error {
	return s.mutate(req.ReferralID, func(r *domain.StoredReferral) error {
		if r.Derive(); r.Final {
			return ErrFinal
		}
		keepHistory(r)
		r.Request, r.Decision = req, decision
		r.Hold()
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
// A referral not in memory is looked up in the database: another instance may have created it since the last sync.
func (s *MemoryStore) Get(id string) (domain.StoredReferral, bool) {
	s.mu.RLock()
	item, ok := s.items[id]
	s.mu.RUnlock()
	if !ok && s.persist != nil {
		s.mu.Lock()
		ctx, cancel := context.WithTimeout(context.Background(), bestEffortTimeout)
		if fresh, _, err := s.freshest(ctx, id); err == nil && fresh != nil {
			s.place(id, *fresh)
			item, ok = s.items[id], true
		}
		cancel()
		s.mu.Unlock()
	}
	if !ok {
		return domain.StoredReferral{}, false
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
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
	// The id breaks ties, so the order is the same on every call: paged lists depend on it.
	sort.Slice(out, func(i, j int) bool {
		if a, b := out[i].Decision.Score, out[j].Decision.Score; a != b {
			return a > b
		}
		return out[i].Request.ReferralID < out[j].Request.ReferralID
	})
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
