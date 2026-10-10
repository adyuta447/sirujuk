package repository

import (
	"slices"
	"sort"
	"sync"

	"github.com/sirujuk/backend-go/domain"
)

// maxStored bounds memory: an authenticated caller must not be able to grow the process without limit.
const maxStored = 5000

// MemoryStore keeps dummy referrals in memory only. Cleared on restart and not shared between Cloud Run instances.
// shortcut: demo store; replace with a database before real referral data.
type MemoryStore struct {
	mu    sync.RWMutex
	items map[string]*domain.StoredReferral
	order []string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{items: make(map[string]*domain.StoredReferral)}
}

func (s *MemoryStore) Upsert(req domain.ReferralRequest, decision domain.RiskDecision) {
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, ok := s.items[req.ReferralID]
	if ok {
		existing.Request = req
		existing.Decision = decision
		return
	}
	if len(s.items) >= maxStored {
		return
	}
	s.items[req.ReferralID] = &domain.StoredReferral{Request: req, Decision: decision}
	s.order = append(s.order, req.ReferralID)
}

// Get returns a copy, so callers can encode it while AddAudit appends.
func (s *MemoryStore) Get(id string) (domain.StoredReferral, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.items[id]
	if !ok {
		return domain.StoredReferral{}, false
	}
	cp := *item
	cp.Audits = slices.Clone(item.Audits)
	return cp, true
}

func (s *MemoryStore) List() []domain.StoredReferral {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]domain.StoredReferral, 0, len(s.order))
	for _, id := range s.order {
		cp := *s.items[id]
		cp.Audits = slices.Clone(cp.Audits)
		out = append(out, cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Decision.Score > out[j].Decision.Score })
	return out
}

func (s *MemoryStore) AddAudit(id string, audit domain.AuditReview) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.items[id]
	if !ok {
		return false
	}
	item.Audits = append(item.Audits, audit)
	return true
}

func (s *MemoryStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.items)
}
