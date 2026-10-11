package repository

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/sealbox"
)

const (
	referralsCollection = "referrals"
	maxReferralDoc      = 1 << 20 // Firestore's own document limit
	loadPageSize        = 300
)

// Persister makes referral state (scores, audits, clarifications) survive restarts and be shared by instances.
type Persister interface {
	Save(ctx context.Context, item domain.StoredReferral) error
	LoadAll(ctx context.Context) ([]domain.StoredReferral, error)
}

// FirestoreReferrals stores each referral as one document: the whole StoredReferral as one JSON string. With Key set
// (DATA_ENC_KEY) that string is sealed with AES-256-GCM before it leaves the process, so the patient name and the
// narrative are unreadable in the Firestore console and in exports; only the referral id stays plain.
// Without a key the document is plaintext (Google's default encryption at rest only), which is acceptable for synthetic
// data and nothing else. Documents written without a key still load after a key is added; the reverse fails loudly.
type FirestoreReferrals struct {
	firestoreREST
	Key []byte
}

func NewFirestoreReferrals(project string, token func(context.Context) (string, error)) FirestoreReferrals {
	return FirestoreReferrals{firestoreREST: newFirestoreREST(project, token)}
}

// Encrypted reports whether documents are sealed before saving.
func (f FirestoreReferrals) Encrypted() bool { return f.Key != nil }

// WithKey returns a copy that seals every document it saves.
func (f FirestoreReferrals) WithKey(key []byte) FirestoreReferrals { f.Key = key; return f }

// encode puts the referral JSON into the document fields, sealed when a key is set.
func (f FirestoreReferrals) encode(id string, raw []byte) (map[string]fsString, error) {
	if f.Key == nil {
		return map[string]fsString{"id": {id}, "json": {string(raw)}}, nil
	}
	sealed, err := sealbox.Seal(f.Key, raw)
	if err != nil {
		return nil, err
	}
	return map[string]fsString{"id": {id}, "json_enc": {base64.StdEncoding.EncodeToString(sealed)}}, nil
}

// decode is the reverse of encode. It accepts both forms so enabling encryption later does not orphan old documents.
func (f FirestoreReferrals) decode(fields map[string]fsString) ([]byte, error) {
	if enc, ok := fields["json_enc"]; ok {
		if f.Key == nil {
			return nil, errors.New("referral document is encrypted but DATA_ENC_KEY is not set")
		}
		sealed, err := base64.StdEncoding.DecodeString(enc.S)
		if err != nil {
			return nil, err
		}
		return sealbox.Open(f.Key, sealed)
	}
	return []byte(fields["json"].S), nil
}

// doc hashes the referral ID: IDs may contain "/" and must not shape the document path.
func (f FirestoreReferrals) doc(id string) string {
	h := sha256.Sum256([]byte(id))
	return f.collection(referralsCollection) + "/" + hex.EncodeToString(h[:])
}

func (f FirestoreReferrals) Save(ctx context.Context, item domain.StoredReferral) error {
	raw, err := json.Marshal(item)
	if err != nil {
		return err
	}
	fields, err := f.encode(item.Request.ReferralID, raw)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(fsDoc{Fields: fields})
	resp, err := f.do(ctx, http.MethodPatch, f.doc(item.Request.ReferralID), body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("firestore status %d", resp.StatusCode)
	}
	return nil
}

func (f FirestoreReferrals) LoadAll(ctx context.Context) ([]domain.StoredReferral, error) {
	var out []domain.StoredReferral
	token := ""
	for {
		page, next, err := f.loadPage(ctx, token)
		if err != nil {
			return nil, err
		}
		out = append(out, page...)
		if next == "" {
			return out, nil
		}
		token = next
	}
}

func (f FirestoreReferrals) loadPage(ctx context.Context, pageToken string) ([]domain.StoredReferral, string, error) {
	u := fmt.Sprintf("%s?pageSize=%d", f.collection(referralsCollection), loadPageSize)
	if pageToken != "" {
		u += "&pageToken=" + url.QueryEscape(pageToken)
	}
	resp, err := f.do(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("firestore status %d", resp.StatusCode)
	}
	var body struct {
		Documents     []fsDoc `json:"documents"`
		NextPageToken string  `json:"nextPageToken"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*maxReferralDoc)).Decode(&body); err != nil {
		return nil, "", err
	}
	items := make([]domain.StoredReferral, 0, len(body.Documents))
	for _, d := range body.Documents {
		raw, err := f.decode(d.Fields)
		if err != nil {
			return nil, "", fmt.Errorf("unreadable referral document: %w", err)
		}
		var item domain.StoredReferral
		if err := json.Unmarshal(raw, &item); err != nil {
			return nil, "", fmt.Errorf("corrupt referral document: %w", err)
		}
		items = append(items, item)
	}
	return items, body.NextPageToken, nil
}

var _ Persister = FirestoreReferrals{}
