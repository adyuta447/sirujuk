package client

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

var metadataIDURL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity"

// CloudRunIDToken returns a token source for calling a private Cloud Run service as this service's account.
// It asks the metadata server directly (no SDK dependency); tokens live 1h, cached for 50 min.
func CloudRunIDToken(audience string) func(context.Context) (string, error) {
	var (
		mu  sync.Mutex
		tok string
		exp time.Time
	)
	return func(ctx context.Context) (string, error) {
		mu.Lock()
		defer mu.Unlock()
		if time.Now().Before(exp) {
			return tok, nil
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, metadataIDURL+"?audience="+url.QueryEscape(audience), nil)
		if err != nil {
			return "", err
		}
		req.Header.Set("Metadata-Flavor", "Google")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("metadata server status %d", resp.StatusCode)
		}
		b, err := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
		if err != nil {
			return "", err
		}
		tok, exp = strings.TrimSpace(string(b)), time.Now().Add(50*time.Minute)
		return tok, nil
	}
}
