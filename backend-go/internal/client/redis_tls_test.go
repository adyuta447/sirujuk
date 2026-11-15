package client

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"os"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

// selfSigned makes a certificate shaped like the one infra/gcp/redis-vm.sh creates: self-signed, IP SAN, not a CA.
func selfSigned(t *testing.T, ip string) (tls.Certificate, string) {
	key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "sirujuk-redis"},
		NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour),
		IPAddresses: []net.IP{net.ParseIP(ip)}, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: key}, string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}))
}

func TestRedisTLSTrustsOnlyThePinnedCertificate(t *testing.T) {
	cert, certPEM := selfSigned(t, "127.0.0.1")
	mr := miniredis.NewMiniRedis()
	if err := mr.StartTLS(&tls.Config{Certificates: []tls.Certificate{cert}}); err != nil {
		t.Fatal(err)
	}
	defer mr.Close()
	ctx := context.Background()

	r, err := NewRedis("rediss://"+mr.Addr(), certPEM)
	if err != nil || r.Ping(ctx) != nil {
		t.Fatalf("pinned certificate must connect: %v", err)
	}
	_, otherPEM := selfSigned(t, "127.0.0.1")
	if r, _ := NewRedis("rediss://"+mr.Addr(), otherPEM); r.Ping(ctx) == nil {
		t.Fatal("a server whose certificate is not the pinned one must be refused")
	}
	if _, err := NewRedis("redis://"+mr.Addr(), certPEM); err == nil {
		t.Fatal("a CA with a plaintext URL is a misconfiguration and must fail at startup")
	}
	if _, err := NewRedis("rediss://"+mr.Addr(), "not pem"); err == nil {
		t.Fatal("an unreadable CA must fail at startup")
	}
}

// Against a real Redis (set REDIS_TLS_TEST_URL and REDIS_TLS_TEST_CA to try the redis-vm.sh setup locally).
func TestRedisTLSAgainstRealServer(t *testing.T) {
	url, caFile := os.Getenv("REDIS_TLS_TEST_URL"), os.Getenv("REDIS_TLS_TEST_CA")
	if url == "" {
		t.Skip("REDIS_TLS_TEST_URL not set")
	}
	ca, err := os.ReadFile(caFile)
	if err != nil {
		t.Fatal(err)
	}
	r, err := NewRedis(url, string(ca))
	if err != nil {
		t.Fatal(err)
	}
	if err := r.Ping(context.Background()); err != nil {
		t.Fatalf("ping over TLS: %v", err)
	}
}
