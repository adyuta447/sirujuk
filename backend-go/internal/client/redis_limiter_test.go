package client

import (
	"context"
	"testing"
	"time"
)

func TestHitCountsWithinWindowThenResets(t *testing.T) {
	r, mr := newTestRedis(t)
	ctx := context.Background()
	for want := int64(1); want <= 3; want++ {
		if n, err := r.Hit(ctx, "login:x", time.Minute); err != nil || n != want {
			t.Fatalf("hit %d: got %d, %v", want, n, err)
		}
	}
	if ttl := mr.TTL("login:x"); ttl <= 0 || ttl > time.Minute {
		t.Fatalf("window must be set on the first hit and never extended: ttl=%v", ttl)
	}
	mr.FastForward(time.Minute + time.Second)
	if n, _ := r.Hit(ctx, "login:x", time.Minute); n != 1 {
		t.Fatalf("counter must reset after the window, got %d", n)
	}
}

func TestNewRedisRejectsBadURLWithoutPanic(t *testing.T) {
	if _, err := NewRedis("not a url"); err == nil {
		t.Fatal("want error")
	}
}
