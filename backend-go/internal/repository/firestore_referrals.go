package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/sirujuk/backend-go/domain"
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

// FirestoreReferrals stores each referral as one document: the whole StoredReferral as a JSON string.
// shortcut: patient name and narrative are plaintext here (Firestore encrypts at rest, but the rules ask for
// pseudonymized IDs and encrypted narrative); fix before real patient data.
type FirestoreReferrals struct{ firestoreREST }

func NewFirestoreReferrals(project string, token func(context.Context) (string, error)) FirestoreReferrals {
	return FirestoreReferrals{newFirestoreREST(project, token)}
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
	body, _ := json.Marshal(fsDoc{Fields: map[string]fsString{"id": {item.Request.ReferralID}, "json": {string(raw)}}})
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
		var item domain.StoredReferral
		if err := json.Unmarshal([]byte(d.Fields["json"].S), &item); err != nil {
			return nil, "", fmt.Errorf("corrupt referral document: %w", err)
		}
		items = append(items, item)
	}
	return items, body.NextPageToken, nil
}

var _ Persister = FirestoreReferrals{}
