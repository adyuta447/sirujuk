package handler

import (
	"context"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/sirujuk/backend-go/domain"
	"github.com/sirujuk/backend-go/internal/repository"
)

const (
	defaultActivityLimit = 50
	maxActivityLimit     = 200
)

// ActivityLog: GET /activity?limit=&cursor=&actor=&resource=&action=&outcome=&referral_id=. Newest first, as
// {items, next}; next is the cursor for the following page, "" on the last. TKMKB reads everyone's entries; every
// other role reads its own only (actor is then ignored), so a doctor can see what was done under their account.
func (h ReferralHandler) ActivityLog(w http.ResponseWriter, r *http.Request) {
	self, role, ok := actorIn(w, r, roleTKMKB, roleVerifikator, roleDinkes, roleDokter)
	if !ok {
		return
	}
	if h.ActivityStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{"ACTIVITY_UNAVAILABLE", "The activity log is not available", ""})
		return
	}
	q, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		badRequest(w)
		return
	}
	limit := defaultActivityLimit
	if q.Has("limit") {
		if limit, err = strconv.Atoi(q.Get("limit")); err != nil || limit < 1 || limit > maxActivityLimit {
			badRequest(w)
			return
		}
	}
	cursorAt, cursorID, hasCursor := strings.Cut(q.Get("cursor"), "|")
	if q.Has("cursor") && (!hasCursor || cursorID == "" || !validActivityTime(cursorAt)) {
		badRequest(w)
		return
	}
	actor := q.Get("actor")
	if role != roleTKMKB {
		actor = self
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	all, err := h.ActivityStore.Recent(ctx, repository.ActivityWindow)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{"ACTIVITY_UNAVAILABLE", "The activity log is not available", ""})
		return
	}
	sort.SliceStable(all, func(i, j int) bool { return newerActivity(all[i].At, all[i].ID, all[j].At, all[j].ID) })
	items, next := []domain.Activity{}, ""
	for _, e := range all {
		if q.Has("cursor") && !newerActivity(cursorAt, cursorID, e.At, e.ID) { // keep only what is older than the cursor
			continue
		}
		if (actor != "" && e.Actor != actor) || !matchOr(q.Get("resource"), e.Resource) || !matchOr(q.Get("action"), e.Action) ||
			!matchOr(q.Get("outcome"), e.Outcome) || !matchOr(q.Get("referral_id"), e.ResourceID) {
			continue
		}
		if len(items) == limit {
			last := items[len(items)-1]
			next = last.At + "|" + last.ID
			break
		}
		items = append(items, e)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "next": next})
}

// newerActivity orders entries newest first; the id breaks a tie inside one millisecond so a page boundary never skips one.
func newerActivity(atA, idA, atB, idB string) bool {
	if atA != atB {
		return atA > atB
	}
	return idA > idB
}

func matchOr(want, got string) bool { return want == "" || want == got }

func validActivityTime(s string) bool {
	_, err := time.Parse(domain.OrderedTime, s)
	return err == nil
}
