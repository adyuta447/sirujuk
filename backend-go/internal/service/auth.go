package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"strings"

	"golang.org/x/crypto/scrypt"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

// Roles is the allow-list of account roles; it mirrors frontend/lib/akses.ts.
var Roles = map[string]bool{"verifikator": true, "tkmkb": true, "dinkes": true, "dokter": true}

// Same parameters as Node's crypto.scrypt defaults, so hashes made by frontend/scripts/buat-pengguna.mjs still verify.
const (
	scryptN, scryptR, scryptP = 16384, 8, 1
	keyLen                    = 64
)

func derive(password string, salt []byte, n int) ([]byte, error) {
	return scrypt.Key([]byte(password), salt, scryptN, scryptR, scryptP, n)
}

// HashPassword returns "scrypt:<salt hex>:<key hex>" with a fresh random salt.
func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key, err := derive(password, salt, keyLen)
	if err != nil {
		return "", err
	}
	return "scrypt:" + hex.EncodeToString(salt) + ":" + hex.EncodeToString(key), nil
}

// ValidHash reports whether s has the stored-hash shape, without checking any password.
func ValidHash(s string) bool {
	p := strings.Split(s, ":")
	if len(p) != 3 || p[0] != "scrypt" {
		return false
	}
	salt, e1 := hex.DecodeString(p[1])
	key, e2 := hex.DecodeString(p[2])
	return e1 == nil && e2 == nil && len(salt) >= 8 && len(key) >= 16 && len(key) <= 128
}

func matches(password, hash string) bool {
	if !ValidHash(hash) {
		return false
	}
	p := strings.Split(hash, ":")
	salt, _ := hex.DecodeString(p[1])
	want, _ := hex.DecodeString(p[2])
	got, err := derive(password, salt, len(want))
	return err == nil && subtle.ConstantTimeCompare(got, want) == 1
}

// A well-formed hash nobody can match, so unknown emails cost the same time as wrong passwords.
var dummyHash = "scrypt:" + strings.Repeat("00", 16) + ":" + strings.Repeat("00", keyLen)

type Authenticator struct{ Users repository.UserRepository }

// Verify returns the account (without its hash) when email and password match.
// A store failure is an error, not a rejection, so callers can tell "wrong password" from "database down".
func (a Authenticator) Verify(ctx context.Context, email, password string) (domain.User, bool, error) {
	u, found, err := a.Users.Find(ctx, email)
	if err != nil {
		return domain.User{}, false, err
	}
	hash := dummyHash
	if found {
		hash = u.Hash
	}
	ok := matches(password, hash)
	if !found || !ok || !Roles[u.Role] || u.Disabled {
		return domain.User{}, false, nil
	}
	u.Hash = ""
	return u, true, nil
}
