package client

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/service"
)

// Redis is the cache for batch doctor features and the retry stream for async scoring.
type Redis struct{ C *redis.Client }

func NewRedis(url string) (Redis, error) {
	opt, err := redis.ParseURL(url)
	return Redis{redis.NewClient(opt)}, err
}

// Get returns nil, nil on a miss.
func (r Redis) Get(ctx context.Context, key string) ([]byte, error) {
	b, err := r.C.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	return b, err
}

func (r Redis) Set(ctx context.Context, key string, v []byte) error {
	return r.C.Set(ctx, key, v, 24*time.Hour).Err()
}

// Enqueue adds to stream "scoring:retry". shortcut: no consumer or DLQ yet, build the worker before the pilot.
func (r Redis) Enqueue(ctx context.Context, req domain.ReferralRequest, reason string) error {
	b, _ := json.Marshal(req)
	return r.C.XAdd(ctx, &redis.XAddArgs{Stream: "scoring:retry", Values: map[string]any{"referral": b, "reason": reason}}).Err()
}

var (
	_ service.Cache = Redis{}
	_ service.Queue = Redis{}
)
