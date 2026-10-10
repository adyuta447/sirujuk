package repository

import (
	"context"
	"encoding/json"
	"strings"
	"sync"

	"github.com/sirujuk/backend-go/domain"
)

// UserRepository stores login accounts, keyed by lower-cased email.
type UserRepository interface {
	Find(ctx context.Context, email string) (domain.User, bool, error)
	Put(ctx context.Context, u domain.User) error
}

func normEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

// MemoryUsers is for local development and tests. Production uses FirestoreUsers.
type MemoryUsers struct {
	mu sync.RWMutex
	m  map[string]domain.User
}

// NewMemoryUsers seeds from a JSON array of {email,nama,role,hash}; bad JSON yields an empty store.
func NewMemoryUsers(seed string) *MemoryUsers {
	s := &MemoryUsers{m: map[string]domain.User{}}
	var users []domain.User
	if json.Unmarshal([]byte(seed), &users) == nil {
		for _, u := range users {
			s.m[normEmail(u.Email)] = u
		}
	}
	return s
}

func (s *MemoryUsers) Find(_ context.Context, email string) (domain.User, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.m[normEmail(email)]
	return u, ok, nil
}

func (s *MemoryUsers) Put(_ context.Context, u domain.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[normEmail(u.Email)] = u
	return nil
}
