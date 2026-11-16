package domain

// Activity is one line of the user activity log: who did what to which record, and whether it went through.
// It never holds patient text: Detail carries field names or an outcome word only.
type Activity struct {
	ID            string   `json:"id"`
	At            string   `json:"at"`                    // OrderedTime, UTC: strings sort in time order
	Actor         string   `json:"actor"`                 // account email; "" when nobody was signed in (a failed login)
	Role          string   `json:"role"`                  // verifikator | tkmkb | dinkes | dokter | ""
	Action        string   `json:"action"`                // create | read | list | update | delete | rescore | simulate | login | logout
	Resource      string   `json:"resource"`              // referral | clarification | audit | simulation | config | session
	ResourceID    string   `json:"resource_id,omitempty"` // referral id when there is one
	Outcome       string   `json:"outcome"`               // ok | denied | rejected | failed
	Status        int      `json:"status"`                // HTTP status the caller got
	Detail        []string `json:"detail,omitempty"`
	CorrelationID string   `json:"correlation_id,omitempty"`
	Source        string   `json:"source,omitempty"` // backend: seen by this service; proxy: a refusal the Next.js proxy reported
}

// Activity sources.
const (
	ActivityFromBackend = "backend"
	ActivityFromProxy   = "proxy"
)

// Activity outcomes, from the HTTP status: 2xx ok; 401, 403 and 429 denied (not allowed); other 4xx rejected (the
// request was wrong or conflicted); 5xx failed (nothing was changed).
const (
	ActivityOK       = "ok"
	ActivityDenied   = "denied"
	ActivityRejected = "rejected"
	ActivityFailed   = "failed"
)

// ActivityOutcome maps an HTTP status to one of the outcomes above.
func ActivityOutcome(status int) string {
	switch {
	case status < 400:
		return ActivityOK
	case status == 401 || status == 403 || status == 429:
		return ActivityDenied
	case status < 500:
		return ActivityRejected
	}
	return ActivityFailed
}
