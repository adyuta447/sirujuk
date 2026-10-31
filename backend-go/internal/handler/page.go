package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/sirujuk/backend-go/domain"
)

// maxPageLimit caps ?limit=, so a huge limit cannot turn the paged form back into one big response.
const maxPageLimit = 100

// sortKey is a referral's place in the paged order: held claims first, then red, yellow, green, then score high to
// low, then referral id (so the order never changes between calls). A cursor is the key of the last row of a page,
// so it names a position and keeps working if that row is archived or re-scored in the meantime.
type sortKey struct {
	Held  int     `json:"h"` // 0 = claim held
	Risk  int     `json:"k"` // 0 red, 1 yellow, 2 green, 3 anything else
	Score float64 `json:"s"`
	ID    string  `json:"i"`
}

func keyOf(it domain.StoredReferral, role string) sortKey {
	k := sortKey{Held: 1, Risk: 3, ID: it.Request.ReferralID}
	if it.ClaimStatus == domain.ClaimHeld {
		k.Held = 0
	}
	switch it.Decision.Decision {
	case "red":
		k.Risk = 0
	case "yellow":
		k.Risk = 1
	case "green":
		k.Risk = 2
	}
	if role != roleDokter { // a doctor never sees scores, so neither the order nor the cursor may carry one
		k.Score = it.Decision.Score
	}
	return k
}

func (a sortKey) less(b sortKey) bool {
	switch {
	case a.Held != b.Held:
		return a.Held < b.Held
	case a.Risk != b.Risk:
		return a.Risk < b.Risk
	case a.Score != b.Score:
		return a.Score > b.Score
	}
	return a.ID < b.ID
}

func (a sortKey) encode() string {
	raw, _ := json.Marshal(a)
	return base64.RawURLEncoding.EncodeToString(raw)
}

func decodeCursor(s string) (sortKey, bool) {
	var k sortKey
	raw, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return k, false
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	// The id is not held to idRe: imported (BPJS) referral numbers never passed it, and a stricter rule here would
	// strand the cursor of a legitimate page.
	if dec.Decode(&k) != nil || dec.More() || k.ID == "" || len(k.ID) > 128 || k.Held < 0 || k.Held > 1 || k.Risk < 0 || k.Risk > 3 {
		return k, false
	}
	return k, true
}

type pageSummary struct {
	Counts struct {
		Red    int `json:"red"`
		Yellow int `json:"yellow"`
		Green  int `json:"green"`
	} `json:"counts"`
	Held int `json:"held"` // claims held for TKMKB
}

type referralPage struct {
	Items []any   `json:"items"`
	Next  *string `json:"next"`  // null on the last page
	Total int     `json:"total"` // rows matching every filter, not just this page
	// Summary counts the rows matching wilayah and q only, not risk or status, so every chip keeps its number whichever
	// chip is selected. It does not depend on limit or cursor.
	Summary pageSummary `json:"summary"`
}

var claimStatuses = map[string]bool{domain.ClaimNormal: true, domain.ClaimHeld: true, domain.ClaimReleased: true, domain.ClaimConfirmed: true}

// inRegion is the ?wilayah= filter. A row with no origin_wilayah belongs to the same "Tidak diketahui" group that
// /stats puts it in, so every region option /stats offers finds its rows here.
func inRegion(it domain.StoredReferral, wilayah string) bool {
	region := it.Request.OriginWilayah
	if region == "" {
		region = unknownRegion
	}
	return strings.EqualFold(region, wilayah)
}

// matchesQuery is the ?q= search: a case-insensitive substring of the referral id, doctor id, diagnosis code or a
// facility's id or name. The patient's name is deliberately not searchable: a verifier sees only initials, and a
// search would let them find out the rest one letter at a time.
func matchesQuery(it domain.StoredReferral, needle string) bool {
	r := it.Request
	for _, f := range []string{r.ReferralID, r.DoctorID, r.DiagnosisCode, r.OriginFacilityID, r.OriginFacilityName, r.DestinationFacilityID, r.DestinationFacilityName} {
		if strings.Contains(strings.ToLower(f), needle) {
			return true
		}
	}
	return false
}

// page answers GET /referrals?limit=&cursor=&wilayah=&risk=&status=&q=. visible is already limited to what the caller
// may see; every row goes through shown, so redaction is the same on every page. Bad input is a 400, never a 500.
func page(w http.ResponseWriter, q url.Values, visible []domain.StoredReferral, role string) {
	for _, name := range []string{"limit", "cursor", "risk", "status", "wilayah", "q"} {
		if len(q[name]) > 1 { // "?limit=10&limit=20" is ambiguous: refuse rather than silently pick the first
			badRequest(w)
			return
		}
	}
	limit, err := strconv.Atoi(q.Get("limit"))
	risk, status, wilayah, search := q.Get("risk"), q.Get("status"), q.Get("wilayah"), q.Get("q")
	if !q.Has("limit") || err != nil || limit < 1 ||
		(risk != "" && risk != "red" && risk != "yellow" && risk != "green") ||
		(status != "" && !claimStatuses[status]) || text(wilayah, 64, false, false) != nil || text(search, 100, false, false) != nil {
		badRequest(w) // a cursor without a limit is also refused
		return
	}
	limit = min(limit, maxPageLimit)
	needle := strings.ToLower(strings.TrimSpace(search))
	var cur *sortKey
	if q.Has("cursor") {
		k, ok := decodeCursor(q.Get("cursor"))
		if !ok {
			badRequest(w)
			return
		}
		cur = &k
	}

	type row struct {
		key  sortKey
		item domain.StoredReferral
	}
	var rows []row
	var out referralPage
	for _, it := range visible {
		if (wilayah != "" && !inRegion(it, wilayah)) || (needle != "" && !matchesQuery(it, needle)) {
			continue
		}
		switch it.Decision.Decision {
		case "red":
			out.Summary.Counts.Red++
		case "yellow":
			out.Summary.Counts.Yellow++
		case "green":
			out.Summary.Counts.Green++
		}
		if it.ClaimStatus == domain.ClaimHeld {
			out.Summary.Held++
		}
		if (risk == "" || it.Decision.Decision == risk) && (status == "" || it.ClaimStatus == status) {
			rows = append(rows, row{keyOf(it, role), it})
		}
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].key.less(rows[j].key) })

	start := 0
	if cur != nil {
		start = sort.Search(len(rows), func(i int) bool { return cur.less(rows[i].key) })
	}
	end := min(start+limit, len(rows))
	out.Total, out.Items = len(rows), make([]any, 0, end-start)
	for _, rw := range rows[start:end] {
		out.Items = append(out.Items, shown(rw.item, role))
	}
	if end < len(rows) {
		next := rows[end-1].key.encode()
		out.Next = &next
	}
	writeJSON(w, http.StatusOK, out)
}
