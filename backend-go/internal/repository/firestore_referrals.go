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
	"strings"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/aead"
)

const (
	referralsCollection = "referrals"
	maxReferralDoc      = 1 << 20 // Firestore's own document limit
	loadPageSize        = 300
)

// Persister makes referral state (scores, audits, clarifications) survive restarts and be shared by instances.
// Every item carries its Version (the database's update time).
type Persister interface {
	// Save writes item only if the stored copy is still at item.Version ("" = must not exist yet) and returns the
	// new version, or ErrConflict.
	Save(ctx context.Context, item domain.StoredReferral) (string, error)
	Load(ctx context.Context, id string) (domain.StoredReferral, error) // ErrNotFound when absent
	LoadAll(ctx context.Context) ([]domain.StoredReferral, error)
	// ChangedSince returns referrals saved at or after since (by the saving instance's clock).
	ChangedSince(ctx context.Context, since time.Time) ([]domain.StoredReferral, error)
}

// updatedLayout is fixed-width UTC, so the "updated" string field sorts like the time and can be range-queried.
const updatedLayout = "2006-01-02T15:04:05.000000000Z"

// FirestoreReferrals stores each referral as one document: the whole StoredReferral as a JSON string. With Key set
// (DATA_ENC_KEY) that string is sealed with AES-256-GCM ("json_enc"), so patient name, narrative and audits are
// unreadable to anyone with database access alone. Older plaintext documents ("json") still load and are sealed on
// their next save.
type FirestoreReferrals struct {
	firestoreREST
	Key []byte // 32 bytes; nil = plaintext (development only, main refuses it in production)
}

func NewFirestoreReferrals(project string, token func(context.Context) (string, error), key []byte) FirestoreReferrals {
	return FirestoreReferrals{newFirestoreREST(project, token), key}
}

// doc hashes the referral ID: IDs may contain "/" and must not shape the document path.
func (f FirestoreReferrals) doc(id string) string {
	h := sha256.Sum256([]byte(id))
	return f.collection(referralsCollection) + "/" + hex.EncodeToString(h[:])
}

func (f FirestoreReferrals) Save(ctx context.Context, item domain.StoredReferral) (string, error) {
	raw, err := json.Marshal(item)
	if err != nil {
		return "", err
	}
	fields := map[string]fsString{"id": {item.Request.ReferralID}, "updated": {time.Now().UTC().Format(updatedLayout)}}
	if f.Key != nil {
		sealed, err := aead.Seal(f.Key, raw)
		if err != nil {
			return "", err
		}
		fields["json_enc"] = fsString{base64.StdEncoding.EncodeToString(sealed)}
	} else {
		fields["json"] = fsString{string(raw)}
	}
	// PATCH without an update mask replaces the whole document, so a plaintext "json" field never survives a sealed save.
	body, _ := json.Marshal(fsDoc{Fields: fields})
	pre := "currentDocument.exists=false"
	if item.Version != "" {
		pre = "currentDocument.updateTime=" + url.QueryEscape(item.Version)
	}
	resp, err := f.do(ctx, http.MethodPatch, f.doc(item.Request.ReferralID)+"?"+pre, body)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", firestoreError(resp)
	}
	var saved fsDoc
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2*maxReferralDoc)).Decode(&saved); err != nil {
		return "", err
	}
	return saved.UpdateTime, nil
}

// firestoreError maps a failed precondition (stale version, or created meanwhile) to ErrConflict.
func firestoreError(resp *http.Response) error {
	var e struct {
		Error struct{ Status string } `json:"error"`
	}
	_ = json.NewDecoder(io.LimitReader(resp.Body, 64<<10)).Decode(&e)
	if resp.StatusCode == http.StatusConflict || e.Error.Status == "FAILED_PRECONDITION" {
		return ErrConflict
	}
	return fmt.Errorf("firestore status %d %s", resp.StatusCode, e.Error.Status)
}

func (f FirestoreReferrals) Load(ctx context.Context, id string) (domain.StoredReferral, error) {
	resp, err := f.do(ctx, http.MethodGet, f.doc(id), nil)
	if err != nil {
		return domain.StoredReferral{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return domain.StoredReferral{}, ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return domain.StoredReferral{}, firestoreError(resp)
	}
	var d fsDoc
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2*maxReferralDoc)).Decode(&d); err != nil {
		return domain.StoredReferral{}, err
	}
	return f.decode(d)
}

func (f FirestoreReferrals) ChangedSince(ctx context.Context, since time.Time) ([]domain.StoredReferral, error) {
	q, _ := json.Marshal(map[string]any{"structuredQuery": map[string]any{
		"from": []any{map[string]string{"collectionId": referralsCollection}},
		"where": map[string]any{"fieldFilter": map[string]any{
			"field": map[string]string{"fieldPath": "updated"}, "op": "GREATER_THAN_OR_EQUAL",
			"value": map[string]string{"stringValue": since.UTC().Format(updatedLayout)},
		}},
	}})
	parent := strings.TrimSuffix(f.collection(referralsCollection), "/"+referralsCollection)
	resp, err := f.do(ctx, http.MethodPost, parent+":runQuery", q)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, firestoreError(resp)
	}
	var rows []struct {
		Document *fsDoc `json:"document"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64*maxReferralDoc)).Decode(&rows); err != nil {
		return nil, err
	}
	out := make([]domain.StoredReferral, 0, len(rows))
	for _, r := range rows {
		if r.Document == nil { // the last row only carries readTime
			continue
		}
		item, err := f.decode(*r.Document)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, nil
}

func (f FirestoreReferrals) decode(d fsDoc) (domain.StoredReferral, error) {
	var item domain.StoredReferral
	raw := []byte(d.Fields["json"].S)
	if enc, ok := d.Fields["json_enc"]; ok {
		if f.Key == nil {
			return item, errors.New("referral document is encrypted but DATA_ENC_KEY is not set")
		}
		sealed, err := base64.StdEncoding.DecodeString(enc.S)
		if err == nil {
			raw, err = aead.Open(f.Key, sealed)
		}
		if err != nil {
			return item, fmt.Errorf("cannot decrypt referral document: %w", err)
		}
	}
	if err := json.Unmarshal(raw, &item); err != nil {
		return item, fmt.Errorf("corrupt referral document: %w", err)
	}
	// The sealed blob is not bound to its document, so check it was not copied over from another referral.
	if item.Request.ReferralID != d.Fields["id"].S {
		return item, errors.New("corrupt referral document: id mismatch")
	}
	item.Version = d.UpdateTime
	return item, nil
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
		item, err := f.decode(d)
		if err != nil {
			return nil, "", err
		}
		items = append(items, item)
	}
	return items, body.NextPageToken, nil
}

var _ Persister = FirestoreReferrals{}
