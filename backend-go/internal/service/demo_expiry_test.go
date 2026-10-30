package service

import (
	"context"
	"testing"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// The four demo accounts in production Firestore were created before expiries existed. They must not log in.
func TestLegacyDemoAccountCannotLogIn(t *testing.T) {
	hash, _ := HashPassword("sandi-demo-lama-123")
	users := repository.NewMemoryUsers("")
	ctx := context.Background()
	_ = users.Put(ctx, domain.User{Email: "tkmkb@demo.sirujuk.id", Nama: "Demo", Role: "tkmkb", Hash: hash})
	_ = users.Put(ctx, domain.User{Email: "tkmkb2@demo.sirujuk.id", Nama: "Demo", Role: "tkmkb", Hash: hash,
		ExpiresAt: time.Now().Add(time.Hour).UTC().Format(time.RFC3339)})
	a := Authenticator{Users: users}

	if _, ok, _ := a.Verify(ctx, "tkmkb@demo.sirujuk.id", "sandi-demo-lama-123"); ok {
		t.Fatal("a demo account without an expiry must be refused even with the right password")
	}
	if _, ok, _ := a.Verify(ctx, "tkmkb2@demo.sirujuk.id", "sandi-demo-lama-123"); !ok {
		t.Fatal("a demo account with a future expiry must still work")
	}
}
