package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// BPJSSource marks rows imported from the BPJS Kesehatan 2025 data sample (2024 visits, de-identified).
const BPJSSource = "bpjs-sampel-2025"

// RunBPJS loads the referrals that ml-service/bpjs.py exports (a JSON list of ReferralRequest whose Context holds the
// point-in-time facility history) and scores each one like Run does. Skipped when the store already has data. The file
// is never in the repository: the sample is under a BPJS data-use agreement.
func RunBPJS(store *repository.MemoryStore, path string, eval func(context.Context, domain.ReferralRequest) (domain.RiskDecision, error)) (int, error) {
	if path == "" || store.Count() > 0 {
		return 0, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	var reqs []domain.ReferralRequest
	if err := json.Unmarshal(data, &reqs); err != nil {
		return 0, fmt.Errorf("%s: %w", path, err)
	}
	for _, req := range reqs {
		store.UpsertSample(req, score(req, eval), BPJSSource)
	}
	return len(reqs), nil
}
