package service

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// ConfigSource gives the decision engine the national risk configuration without any I/O on the scoring path.
type ConfigSource interface {
	Current() (domain.RiskConfig, bool)
}

// LiveConfig holds the last configuration read from the store. Other instances pick up a change within one refresh.
type LiveConfig struct {
	mu  sync.RWMutex
	cfg domain.RiskConfig
	set bool
}

func (l *LiveConfig) Current() (domain.RiskConfig, bool) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.cfg, l.set
}

func (l *LiveConfig) Set(cfg domain.RiskConfig) {
	l.mu.Lock()
	l.cfg, l.set = cfg, true
	l.mu.Unlock()
}

// Refresh reads the store once. On an error it keeps what it had: a store outage must not change anyone's category.
func (l *LiveConfig) Refresh(ctx context.Context, store repository.RiskConfigRepository) {
	cfg, found, err := store.Load(ctx)
	switch {
	case err != nil:
		log.Printf(`{"event":"risk_config_refresh_failed","effect":"keeping the last known configuration"}`)
	case found:
		l.Set(cfg)
	}
}

// Run refreshes every interval until ctx ends.
func (l *LiveConfig) Run(ctx context.Context, store repository.RiskConfigRepository, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			cctx, cancel := context.WithTimeout(ctx, 3*time.Second)
			l.Refresh(cctx, store)
			cancel()
		}
	}
}
