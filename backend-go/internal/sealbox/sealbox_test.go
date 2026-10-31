package sealbox

import (
	"bytes"
	"testing"
)

var key = []byte("0123456789abcdef0123456789abcdef")

func TestRoundTripAndFreshNonce(t *testing.T) {
	a, err := Seal(key, []byte("rahasia pasien"))
	if err != nil {
		t.Fatal(err)
	}
	b, _ := Seal(key, []byte("rahasia pasien"))
	if bytes.Equal(a, b) {
		t.Fatal("the same plaintext must not seal to the same bytes (nonce reuse)")
	}
	if bytes.Contains(a, []byte("rahasia")) {
		t.Fatal("plaintext visible in sealed output")
	}
	got, err := Open(key, a)
	if err != nil || string(got) != "rahasia pasien" {
		t.Fatalf("round trip: %q %v", got, err)
	}
}

func TestOpenRejectsTamperingWrongKeyAndShortInput(t *testing.T) {
	sealed, _ := Seal(key, []byte("data"))
	flipped := append([]byte(nil), sealed...)
	flipped[len(flipped)-1] ^= 1
	if _, err := Open(key, flipped); err == nil {
		t.Fatal("modified message must not open")
	}
	if _, err := Open([]byte("ffffffffffffffffffffffffffffffff"), sealed); err == nil {
		t.Fatal("wrong key must not open")
	}
	if _, err := Open(key, []byte("short")); err == nil {
		t.Fatal("input shorter than a nonce must be an error, not a panic")
	}
	if _, err := Seal([]byte("short key"), []byte("x")); err == nil {
		t.Fatal("a key that is not 32 bytes must be refused")
	}
}
