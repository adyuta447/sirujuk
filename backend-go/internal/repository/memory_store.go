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
	conflictRetries   = 3
	// syncOverlap re-reads a margin before the last sync: the "updated" field is written with each instance's clock.
	syncOverlap = time.Minute
)

var (
	ErrNotFound = errors.New("referral not found")
	ErrLimit    = errors.New("limit reached")
	// ErrExists means a referral with that number is already stored (Insert never overwrites).
	ErrExists = errors.New("referral already exists")
	// ErrFinal means the referral already has its final human decision; it can no longer be decided again, edited or re-scored.
	ErrFinal = errors.New("referral decision is final")
	// ErrStorage means the change was NOT applied because it could not be saved durably.
	ErrStorage = errors.New("storage unavailable")
	// ErrConflict means another instance saved the referral after this copy was read; nothing was written.
	ErrConflict = errors.New("referral changed by another instance")
)

// MemoryStore holds referrals in memory and, when a Persister is set, writes every change through to it first.
// Several instances can share one Persister: writes are conditional on the version last read (a lost race is retried
// on the newer copy, so no audit is overwritten), and Sync pulls the other instances' changes into lists.
// shortcut: lists lag other instances by up to one sync interval; move reads to the database if that is too slow.
type MemoryStore struct {
	mu       sync.RWMutex
	items    map[string]*domain.StoredReferral
	order    []string
	persist  Persister
	syncedAt time.Time
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{items: make(map[string]*domain.StoredReferral)}
}

// UsePersister loads the saved referrals and then writes all later changes through p.
func (s *MemoryStore) UsePersister(ctx context.Context, p Persister) error {
	started := time.Now()
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
	s.persist, s.syncedAt = p, started
	return nil
}

// save writes item conditionally on its version and stores the new version in it. Callers hold s.mu.
func (s *MemoryStore) save(item *domain.StoredReferral) error {
	if s.persist == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), persistTimeout)
	defer cancel()
	v, err := s.persist.Save(ctx, *item)
	if errors.Is(err, ErrConflict) {
		return err
	}
	if err != nil {
		log.Printf(`{"event":"persist_failed","referral_id":%q}`, item.Request.ReferralID)
		return ErrStorage
	}
	item.Version = v
	return nil
}

// reload replaces the in-memory copy with the stored one. Callers hold s.mu.
func (s *MemoryStore) reload(id string) error {
	if s.persist == nil {
		return ErrNotFound
	}
	ctx, cancel := context.WithTimeout(context.Background(), persistTimeout)
	defer cancel()
	item, err := s.persist.Load(ctx, id)
	if err != nil {
		return err
	}
	s.put(item)
	return nil
}

// put stores item, keeping list order. Callers hold s.mu.
func (s *MemoryStore) put(item domain.StoredReferral) {
	id := item.Request.ReferralID
	if _, exists := s.items[id]; !exists {
		s.order = append(s.order, id)
	}
	s.items[id] = &item
}

// apply runs fn on a copy of the referral (a blank one when absent) and saves it. When another instance saved first,
// the newer copy is loaded and fn runs again on it. The in-memory copy changes only after a successful save; on
// failure the unsaved copy is returned. Callers hold s.mu.
func (s *MemoryStore) apply(id string, fn func(*domain.StoredReferral) error) (domain.StoredReferral, error) {
	for attempt := 0; ; attempt++ {
		next := domain.StoredReferral{}
		if cur, ok := s.items[id]; ok {
			next = clone(*cur)
		}
		if err := fn(&next); err != nil {
			return next, err
		}
		err := s.save(&next)
		if err == nil {
			s.put(next)
			return next, nil
		}
		if !errors.Is(err, ErrConflict) || attempt == conflictRetries {
			return next, ErrStorage
		}
		if err := s.reload(id); err != nil {
			return next, ErrStorage
		}
	}
}

// Upsert stores a score. It is on the patient path, so a failed save is logged and the in-memory copy still serves.
func (s *MemoryStore) Upsert(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.upsert(req, decision, false, "")
}

// UpsertSynthetic stores a demo row and marks it synthetic. Only the seed calls it.
func (s *MemoryStore) UpsertSynthetic(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.upsert(req, decision, true, "")
}

// UpsertSample stores a row imported from a historical data sample and records where it came from. Only the seed calls it.
func (s *MemoryStore) UpsertSample(req domain.ReferralRequest, decision domain.RiskDecision, source string) {
	s.upsert(req, decision, false, source)
}

func (s *MemoryStore) upsert(req domain.ReferralRequest, decision domain.RiskDecision, synthetic bool, source string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.items[req.ReferralID]; !exists && len(s.items) >= maxStored {
		return
	}
	next, err := s.apply(req.ReferralID, func(item *domain.StoredReferral) error {
		keepHistory(item)
		item.Request, item.Decision = req, decision
		item.Hold()
		item.Synthetic = item.Synthetic || synthetic
		if source != "" {
			item.Source = source
		}
		return nil
	})
	if err != nil {
		s.put(next) // patient path: serve the score from memory; its old version makes the next save retry cleanly
	}
}

// keepHistory moves an existing referral's current score into History (newest 20).
func keepHistory(r *domain.StoredReferral) {
	if prev := r.Decision; prev.Status == "SCORED" {
		r.History = append(r.History, domain.ScoreSnapshot{Score: prev.Score, Decision: prev.Decision, ModelVersion: prev.ModelVersion, ScoredAt: prev.ScoredAt})
		if len(r.History) > 20 {
			r.History = r.History[len(r.History)-20:]
		}
	}
}

// Insert stores a brand new referral and never overwrites: if the number is taken, here or (seen through the
// conditional save) on another instance, it returns the stored one with ErrExists. Scoring a new referral goes through
// here, so a reused referral number cannot rewrite a referral under review. Patient path: a failed save still serves.
func (s *MemoryStore) Insert(req domain.ReferralRequest, decision domain.RiskDecision) (domain.StoredReferral, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.items[req.ReferralID]; !exists && len(s.items) >= maxStored {
		return domain.StoredReferral{}, ErrLimit
	}
	next, err := s.apply(req.ReferralID, func(item *domain.StoredReferral) error {
		if item.Request.ReferralID != "" {
			return ErrExists
		}
		item.Request, item.Decision = req, decision
		item.Hold()
		return nil
	})
	switch {
	case errors.Is(err, ErrExists):
		return next, ErrExists
	case err != nil:
		s.put(next)
	}
	return next, nil
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

// mutate applies fn and saves it durably before the change is visible: an audit or clarification is never
// acknowledged unless it is saved. A referral another instance created is loaded first.
func (s *MemoryStore) mutate(id string, fn func(*domain.StoredReferral) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.items[id]; !ok {
		if err := s.reload(id); errors.Is(err, ErrNotFound) {
			return ErrNotFound
		} else if err != nil {
			return ErrStorage
		}
	}
	_, err := s.apply(id, func(r *domain.StoredReferral) error {
		if r.Archived {
			return ErrNotFound
		}
		return fn(r)
	})
	return err
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
		if s.reload(id) == nil {
			item, ok = s.items[id]
		}
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

// Sync pulls in referrals other instances saved since the last call; a copy is replaced only by a newer version.
func (s *MemoryStore) Sync(ctx context.Context) error {
	if s.persist == nil {
		return nil
	}
	s.mu.RLock()
	since := s.syncedAt.Add(-syncOverlap)
	s.mu.RUnlock()
	started := time.Now()
	changed, err := s.persist.ChangedSince(ctx, since)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, item := range changed {
		cur, exists := s.items[item.Request.ReferralID]
		if !exists && len(s.items) >= maxStored {
			continue
		}
		if !exists || newer(item.Version, cur.Version) {
			s.put(item)
		}
	}
	s.syncedAt = started
	return nil
}

// RunSync calls Sync every interval until ctx ends.
func (s *MemoryStore) RunSync(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := s.Sync(ctx); err != nil && ctx.Err() == nil {
				log.Printf(`{"event":"referral_sync_failed"}`)
			}
		}
	}
}

// newer compares database update times (RFC 3339); an unreadable local version counts as older.
func newer(remote, local string) bool {
	r, err := time.Parse(time.RFC3339Nano, remote)
	if err != nil {
		return false
	}
	l, err := time.Parse(time.RFC3339Nano, local)
	return err != nil || r.After(l)
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
