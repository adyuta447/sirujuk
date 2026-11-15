package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/sirujuk/backend-go/domain"
)

// RiskConfigRepository keeps the one national risk configuration. Load reports found=false when none was ever saved.
type RiskConfigRepository interface {
	Load(ctx context.Context) (cfg domain.RiskConfig, found bool, err error)
	Save(ctx context.Context, cfg domain.RiskConfig) error
}

// MemoryRiskConfig is for local development and tests.
type MemoryRiskConfig struct {
	mu    sync.RWMutex
	cfg   domain.RiskConfig
	found bool
}

func (m *MemoryRiskConfig) Load(context.Context) (domain.RiskConfig, bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cfg, m.found, nil
}

func (m *MemoryRiskConfig) Save(_ context.Context, cfg domain.RiskConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cfg, m.found = cfg, true
	return nil
}

// FirestoreRiskConfig stores the configuration as one document, config/risk, holding the JSON in a single field.
type FirestoreRiskConfig struct{ firestoreREST }

func NewFirestoreRiskConfig(project string, token func(context.Context) (string, error)) FirestoreRiskConfig {
	return FirestoreRiskConfig{newFirestoreREST(project, token)}
}

func (f FirestoreRiskConfig) doc() string { return f.collection("config") + "/risk" }

func (f FirestoreRiskConfig) Load(ctx context.Context) (domain.RiskConfig, bool, error) {
	resp, err := f.do(ctx, http.MethodGet, f.doc(), nil)
	if err != nil {
		return domain.RiskConfig{}, false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return domain.RiskConfig{}, false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return domain.RiskConfig{}, false, fmt.Errorf("firestore status %d", resp.StatusCode)
	}
	var d fsDoc
	if err := json.NewDecoder(io.LimitReader(resp.Body, 16<<10)).Decode(&d); err != nil {
		return domain.RiskConfig{}, false, err
	}
	var cfg domain.RiskConfig
	if err := json.Unmarshal([]byte(d.Fields["json"].S), &cfg); err != nil {
		return domain.RiskConfig{}, false, err
	}
	if err := cfg.Validate(); err != nil { // a damaged document must not silently change every category
		return domain.RiskConfig{}, false, fmt.Errorf("stored risk config invalid: %w", err)
	}
	return cfg, true, nil
}

func (f FirestoreRiskConfig) Save(ctx context.Context, cfg domain.RiskConfig) error {
	raw, _ := json.Marshal(cfg)
	body, _ := json.Marshal(fsDoc{Fields: map[string]fsString{"json": {string(raw)}}})
	resp, err := f.do(ctx, http.MethodPatch, f.doc(), body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("firestore status %d", resp.StatusCode)
	}
	return nil
}

var (
	_ RiskConfigRepository = (*MemoryRiskConfig)(nil)
	_ RiskConfigRepository = FirestoreRiskConfig{}
)
