package repository

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// FirestoreUsers keeps accounts in the "users" collection of the (default) Firestore database through the REST API,
// so the backend needs no SDK. Access comes from the runtime service account (roles/datastore.user).
type FirestoreUsers struct {
	BaseURL string // overridden in tests
	Project string
	Token   func(context.Context) (string, error)
	HTTP    *http.Client
}

func NewFirestoreUsers(project string, token func(context.Context) (string, error)) FirestoreUsers {
	return FirestoreUsers{BaseURL: "https://firestore.googleapis.com/v1", Project: project, Token: token, HTTP: &http.Client{Timeout: 3 * time.Second}}
}

// doc hashes the email into the document id: no escaping questions, and the id says nothing about the person.
func (f FirestoreUsers) doc(email string) string {
	h := sha256.Sum256([]byte(normEmail(email)))
	return fmt.Sprintf("%s/projects/%s/databases/(default)/documents/users/%s", f.BaseURL, f.Project, hex.EncodeToString(h[:]))
}

type fsString struct {
	S string `json:"stringValue"`
}

type fsDoc struct {
	Fields map[string]fsString `json:"fields"`
}

func (f FirestoreUsers) do(ctx context.Context, method, url string, body []byte) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	tok, err := f.Token(ctx)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Content-Type", "application/json")
	return f.HTTP.Do(req)
}

func (f FirestoreUsers) Find(ctx context.Context, email string) (domain.User, bool, error) {
	resp, err := f.do(ctx, http.MethodGet, f.doc(email), nil)
	if err != nil {
		return domain.User{}, false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return domain.User{}, false, nil
	}
	if resp.StatusCode != http.StatusOK {
		return domain.User{}, false, fmt.Errorf("firestore status %d", resp.StatusCode)
	}
	var d fsDoc
	if err := json.NewDecoder(io.LimitReader(resp.Body, 16<<10)).Decode(&d); err != nil {
		return domain.User{}, false, err
	}
	return domain.User{Email: d.Fields["email"].S, Nama: d.Fields["nama"].S, Role: d.Fields["role"].S, Hash: d.Fields["hash"].S}, true, nil
}

// Put creates or replaces the account (PATCH without an update mask replaces all fields).
func (f FirestoreUsers) Put(ctx context.Context, u domain.User) error {
	body, _ := json.Marshal(fsDoc{Fields: map[string]fsString{
		"email": {normEmail(u.Email)}, "nama": {u.Nama}, "role": {u.Role}, "hash": {u.Hash},
	}})
	resp, err := f.do(ctx, http.MethodPatch, f.doc(u.Email), body)
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
	_ UserRepository = (*MemoryUsers)(nil)
	_ UserRepository = FirestoreUsers{}
)
