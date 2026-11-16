package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/sirujuk/backend-go/domain"
)

// ActivitySink takes a finished entry of the user activity log.
type ActivitySink interface{ Record(domain.Activity) }

type activityKey struct{}

func entryOf(r *http.Request) *domain.Activity {
	e, _ := r.Context().Value(activityKey{}).(*domain.Activity)
	return e
}

// ActivityTag names a route in the activity log. A route without a tag is not logged, so the page-load polling
// (session check, labels, statistics) does not bury the actions people took.
func ActivityTag(resource, action string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if e := entryOf(r); e != nil {
			e.Resource, e.Action = resource, action
		}
		next(w, r)
	}
}

// Note adds what only the handler knows: the record the action was about (when it is not the {id} in the path) and
// field names or an outcome word. Never patient text.
func Note(r *http.Request, id string, detail []string) {
	if e := entryOf(r); e != nil {
		if id != "" {
			e.ResourceID = id
		}
		e.Detail = append(e.Detail, detail...)
	}
}

// NoteActor names the user when the request itself carries no signed-in actor (a login: the account is known only
// once the password checked out).
func NoteActor(r *http.Request, email, role string) {
	if e := entryOf(r); e != nil {
		e.Actor, e.Role = email, role
	}
}

// Stamp gives an entry its id and time.
func Stamp(e *domain.Activity) {
	e.At = time.Now().UTC().Format(domain.OrderedTime)
	var id [12]byte
	_, _ = rand.Read(id[:])
	e.ID = hex.EncodeToString(id[:])
}

const maxActivityDetail, maxActivityID = 20, 64

// Activity records every tagged request once it is answered: who (X-Actor), what (the tag), on which record, and
// what came of it (status). The request is not held up; the sink queues the entry. Refusals at the gate (bad token,
// revoked session, disabled account) never reach it and stay in the access log.
func Activity(sink ActivitySink) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			e := &domain.Activity{}
			sw := &statusWriter{w, http.StatusOK}
			r = r.WithContext(context.WithValue(r.Context(), activityKey{}, e)) // the mux fills in r's path values
			next.ServeHTTP(sw, r)
			if e.Action == "" {
				return
			}
			if e.Actor == "" {
				e.Actor, e.Role = Actor(r)
			}
			if e.ResourceID == "" {
				e.ResourceID = r.PathValue("id")
			}
			e.ResourceID = e.ResourceID[:min(len(e.ResourceID), maxActivityID)]
			e.Detail = e.Detail[:min(len(e.Detail), maxActivityDetail)]
			e.Status, e.Outcome, e.Source = sw.code, domain.ActivityOutcome(sw.code), domain.ActivityFromBackend
			e.CorrelationID = w.Header().Get("X-Correlation-ID")
			Stamp(e)
			sink.Record(*e)
		})
	}
}
