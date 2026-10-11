package repository

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"time"
)

// firestoreREST is the minimal Firestore REST client shared by the user and referral stores.
type firestoreREST struct {
	BaseURL string // overridden in tests
	Project string
	Token   func(context.Context) (string, error)
	HTTP    *http.Client
}

func newFirestoreREST(project string, token func(context.Context) (string, error)) firestoreREST {
	return firestoreREST{BaseURL: "https://firestore.googleapis.com/v1", Project: project, Token: token, HTTP: &http.Client{Timeout: 3 * time.Second}}
}

func (f firestoreREST) collection(name string) string {
	return fmt.Sprintf("%s/projects/%s/databases/(default)/documents/%s", f.BaseURL, f.Project, name)
}

type fsString struct {
	S string `json:"stringValue"`
}

type fsDoc struct {
	Fields     map[string]fsString `json:"fields"`
	UpdateTime string              `json:"updateTime,omitempty"` // set by Firestore on every write; used as the document version
}

func (f firestoreREST) do(ctx context.Context, method, url string, body []byte) (*http.Response, error) {
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
