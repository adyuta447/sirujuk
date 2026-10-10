package domain

// User is a login account. Hash is "scrypt:<salt hex>:<key hex>" and never leaves the backend.
type User struct {
	Email string `json:"email"`
	Nama  string `json:"nama"`
	Role  string `json:"role"`
	Hash  string `json:"hash,omitempty"`
}
