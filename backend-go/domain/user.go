package domain

// User is a login account. Hash is "scrypt:<salt hex>:<key hex>" and never leaves the backend.
type User struct {
	Email string `json:"email"`
	Nama  string `json:"nama"`
	Role  string `json:"role"`
	// DoctorID links a dokter account to the doctor_id on referrals, so a doctor sees and answers only their own.
	DoctorID string `json:"doctor_id,omitempty"`
	// Disabled blocks login and every later request, even inside an existing session.
	Disabled bool   `json:"disabled,omitempty"`
	Hash     string `json:"hash,omitempty"`
}
