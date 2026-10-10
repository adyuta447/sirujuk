package service

import (
	"context"
	"testing"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// Made by frontend/scripts/buat-pengguna.mjs (Node) with the password "contoh-sandi-12345":
// accounts hashed before the move to the backend must keep working.
const nodeHash = "scrypt:a0d0f9dc692acd1789449dc651f9b3ab:38bf825acf90462e7604c7d25eac8d3d739a12a289192ebb6f59a7c5ce86fde9db1553b6c4f72bf8685e9b2b2419b48e4becb2b3f13ed054641b457594b78b7a"

func newAuth(t *testing.T, users ...domain.User) Authenticator {
	t.Helper()
	repo := repository.NewMemoryUsers("")
	for _, u := range users {
		if err := repo.Put(context.Background(), u); err != nil {
			t.Fatal(err)
		}
	}
	return Authenticator{Users: repo}
}

func TestVerifyAcceptsNodeHashAndOwnHash(t *testing.T) {
	own, err := HashPassword("sandi-baru-67890")
	if err != nil {
		t.Fatal(err)
	}
	a := newAuth(t,
		domain.User{Email: "Node@Uji.id", Nama: "Node", Role: "verifikator", Hash: nodeHash},
		domain.User{Email: "go@uji.id", Nama: "Go", Role: "tkmkb", Hash: own},
	)
	ctx := context.Background()
	if u, ok, err := a.Verify(ctx, "node@uji.id", "contoh-sandi-12345"); err != nil || !ok || u.Nama != "Node" || u.Hash != "" {
		t.Fatalf("node-made hash must verify and the hash must not be returned: %+v %v %v", u, ok, err)
	}
	if _, ok, _ := a.Verify(ctx, " GO@uji.id ", "sandi-baru-67890"); !ok {
		t.Fatal("email lookup must ignore case and surrounding spaces")
	}
}

func TestVerifyRejects(t *testing.T) {
	good, _ := HashPassword("sandi-baru-67890")
	a := newAuth(t,
		domain.User{Email: "ok@uji.id", Nama: "Ok", Role: "dokter", Hash: good},
		domain.User{Email: "root@uji.id", Nama: "Root", Role: "admin", Hash: good}, // role outside the allow-list
		domain.User{Email: "bad@uji.id", Nama: "Bad", Role: "dokter", Hash: "plaintext"},
	)
	for name, c := range map[string][2]string{
		"wrong password": {"ok@uji.id", "salah-salah-123"},
		"unknown email":  {"nobody@uji.id", "sandi-baru-67890"},
		"unknown role":   {"root@uji.id", "sandi-baru-67890"},
		"malformed hash": {"bad@uji.id", "plaintext"},
		"empty password": {"ok@uji.id", ""},
	} {
		if _, ok, err := a.Verify(context.Background(), c[0], c[1]); ok || err != nil {
			t.Errorf("%s: want rejected without error, got ok=%v err=%v", name, ok, err)
		}
	}
}

func TestHashIsSaltedAndShaped(t *testing.T) {
	a, _ := HashPassword("sandi-baru-67890")
	b, _ := HashPassword("sandi-baru-67890")
	if a == b || !ValidHash(a) || ValidHash("scrypt:zz:zz") || ValidHash("") {
		t.Fatal("hashes must be salted, well-formed, and malformed ones refused")
	}
}

func TestVerifyRejectsDisabledAccount(t *testing.T) {
	hash, _ := HashPassword("sandi-baru-67890")
	a := newAuth(t, domain.User{Email: "off@uji.id", Nama: "Off", Role: "tkmkb", Hash: hash, Disabled: true})
	if _, ok, err := a.Verify(context.Background(), "off@uji.id", "sandi-baru-67890"); ok || err != nil {
		t.Fatalf("a disabled account must not log in even with the right password: ok=%v err=%v", ok, err)
	}
}
