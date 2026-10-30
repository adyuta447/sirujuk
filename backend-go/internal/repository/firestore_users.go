package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/sirujuk/backend-go/domain"
)

// FirestoreUsers keeps accounts in the "users" collection of the (default) Firestore database through the REST API,
// so the backend needs no SDK. Access comes from the runtime service account (roles/datastore.user).
type FirestoreUsers struct{ firestoreREST }

func NewFirestoreUsers(project string, token func(context.Context) (string, error)) FirestoreUsers {
	return FirestoreUsers{newFirestoreREST(project, token)}
}

// doc hashes the email into the document id: no escaping questions, and the id says nothing about the person.
func (f FirestoreUsers) doc(email string) string {
	h := sha256.Sum256([]byte(normEmail(email)))
	return f.collection("users") + "/" + hex.EncodeToString(h[:])
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
	return domain.User{Email: d.Fields["email"].S, Nama: d.Fields["nama"].S, Role: d.Fields["role"].S, Hash: d.Fields["hash"].S,
		DoctorID: d.Fields["doctor_id"].S, Disabled: d.Fields["disabled"].S == "true", ExpiresAt: d.Fields["expires_at"].S}, true, nil
}

// Put creates or replaces the account (PATCH without an update mask replaces all fields).
func (f FirestoreUsers) Put(ctx context.Context, u domain.User) error {
	body, _ := json.Marshal(fsDoc{Fields: map[string]fsString{
		"email": {normEmail(u.Email)}, "nama": {u.Nama}, "role": {u.Role}, "hash": {u.Hash},
		"doctor_id": {u.DoctorID}, "disabled": {strconv.FormatBool(u.Disabled)}, "expires_at": {u.ExpiresAt},
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
