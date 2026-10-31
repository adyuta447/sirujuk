#!/usr/bin/env bash
# Live security checks for a running SIRUJUK stack that has demo accounts and seeded referrals.
#
#   DEMO_ACCOUNTS=true and SEED_COUNT=200 in the backend environment, then:
#   BASE=http://localhost:3000 bash tests/security/live_checks.sh
#
# The script writes audit rows (the red and yellow referral checks). Run it only against a throwaway demo stack.
# For any address other than localhost you must also set CONFIRM=yes.
set -u
B=${BASE:-http://localhost:3000}
PW=${DEMO_PASSWORD:-'Demo-Sirujuk-2026!'}
case "$B" in
  http://localhost:*|http://127.0.0.1:*) ;;
  *) [ "${CONFIRM:-}" = yes ] || { echo "Refusing to run against $B without CONFIRM=yes"; exit 2; } ;;
esac

pass=0; fail=0
check() { # name, expected, actual
  if [ "$2" = "$3" ]; then pass=$((pass + 1)); printf 'PASS  %s\n' "$1"
  else fail=$((fail + 1)); printf 'FAIL  %s (expected %s, got %s)\n' "$1" "$2" "$3"; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() { # email -> session cookie as name=value
  curl -s -D - -o /dev/null -X POST -H "Origin: $B" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"sandi\":\"$PW\"}" "$B/api/auth/login" | tr -d '\r' |
    grep -i '^set-cookie' | sed -E 's/^[^:]+: *([^;]+);.*/\1/'
}
level_ids() { # cookie, level -> referral ids with that level
  curl -s -H "Cookie: $1" "$B/api/v1/referrals" | python3 -c "
import sys, json
print(' '.join(x['request']['referral_id'] for x in json.load(sys.stdin) if x['decision'].get('decision') == '$2'))"
}
audit() { # cookie, id, origin header value (empty = none)
  local origin=(); [ -n "${3:-}" ] && origin=(-H "Origin: $3")
  code -X POST -H "Cookie: $1" ${origin[@]+"${origin[@]}"} -H 'Content-Type: application/json' \
    -d "{\"referral_id\":\"$2\",\"outcome\":\"valid\",\"note\":\"live check\"}" "$B/api/v1/audits"
}

V=$(login verifikator@demo.sirujuk.id); T=$(login tkmkb@demo.sirujuk.id)
N=$(login dinkes@demo.sirujuk.id); D=$(login dokter@demo.sirujuk.id)
[ -n "$V$T$N$D" ] && [ -n "$V" ] && [ -n "$T" ] && [ -n "$N" ] && [ -n "$D" ] || { echo "Could not log in with the demo accounts. Is DEMO_ACCOUNTS=true?"; exit 2; }

echo "Authentication"
for p in /api/v1/referrals /api/v1/stats /api/auth/me; do check "no session: GET $p" 401 "$(code "$B$p")"; done
check "no session: POST score" 401 "$(code -X POST -H "Origin: $B" -H 'Idempotency-Key: x1' -H 'Content-Type: application/json' -d '{}' "$B/api/v1/referrals/score")"
for p in /dashboard /audit /dinkes /klarifikasi; do check "no session: page $p redirects" 307 "$(code "$B$p")"; done
P=$(echo "${V#*=}" | cut -d. -f1); SIG=$(echo "${V#*=}" | cut -d. -f2)
FORGED=$(echo "$P" | python3 -c "
import sys, base64, json
s = sys.stdin.read().strip(); s += '=' * (-len(s) % 4)
d = json.loads(base64.urlsafe_b64decode(s)); d['role'] = 'tkmkb'
print(base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('='))")
check "forged session payload is rejected" 401 "$(code -H "Cookie: ${V%%=*}=$FORGED.$SIG" "$B/api/v1/referrals")"

echo "Authorization by role"
check "dinkes cannot list referrals" 403 "$(code -H "Cookie: $N" "$B/api/v1/referrals")"
check "dinkes can read stats" 200 "$(code -H "Cookie: $N" "$B/api/v1/stats")"
check "dinkes stats carry no per doctor rows" 0 "$(curl -s -H "Cookie: $N" "$B/api/v1/stats" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)["dokter"]))')"
check "doctor cannot read stats" 403 "$(code -H "Cookie: $D" "$B/api/v1/stats")"
check "doctor is redirected away from /dashboard" 307 "$(code -H "Cookie: $D" "$B/dashboard")"
OTHERS=$(curl -s -H "Cookie: $D" "$B/api/v1/referrals" | python3 -c "
import sys, json
print(len({x['request']['doctor_id'] for x in json.load(sys.stdin)}))")
check "doctor sees referrals of exactly one doctor" 1 "$OTHERS"
FOREIGN=$(curl -s -H "Cookie: $T" "$B/api/v1/referrals" | python3 -c "
import sys, json
print(next((x['request']['referral_id'] for x in json.load(sys.stdin) if x['request']['doctor_id'] != 'd-001'), ''))")
check "doctor cannot audit another doctor's referral" 403 "$(audit "$D" "$FOREIGN" "$B")"

echo "Red referral rule"
RED=$(level_ids "$T" red | cut -d' ' -f1); YEL=$(level_ids "$T" yellow | cut -d' ' -f1)
if [ -n "$RED" ] && [ -n "$YEL" ]; then
  check "verifikator cannot audit a red referral" 403 "$(audit "$V" "$RED" "$B")"
  check "tkmkb can audit a red referral" 201 "$(audit "$T" "$RED" "$B")"
  check "verifikator can audit a yellow referral" 201 "$(audit "$V" "$YEL" "$B")"
  check "verifikator cannot edit a red referral" 403 "$(code -X PUT -H "Cookie: $V" -H "Origin: $B" -H 'Content-Type: application/json' \
    -d '{"doctor_id":"d-001","origin_facility_id":"f-1","destination_facility_id":"f-2","diagnosis_code":"J06.9","reason":"klinis","clinical_narrative":"x"}' "$B/api/v1/referrals/$RED")"
else
  echo "SKIP  no red and yellow referral in the seed data (the seed is random, rerun or raise SEED_COUNT)"
fi

echo "Request integrity"
check "state change without Origin is refused" 403 "$(audit "$T" "$YEL" "")"
check "state change from a foreign Origin is refused" 403 "$(audit "$T" "$YEL" "https://evil.example")"
check "oversized body is refused" 413 "$(head -c 100000 /dev/zero | tr '\0' a | curl -s -o /dev/null -w '%{http_code}' -X POST \
  -H "Cookie: $V" -H "Origin: $B" -H 'Idempotency-Key: big1' -H 'Content-Type: application/json' --data-binary @- "$B/api/v1/referrals/score")"

echo "Login throttle (random unknown email, so no real account is affected)"
EMAIL="nobody-$RANDOM$RANDOM@demo.sirujuk.id"; last=""
for i in 1 2 3 4 5 6; do
  last=$(code -X POST -H "Origin: $B" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"sandi\":\"wrong-password-1\"}" "$B/api/auth/login")
  [ "$i" -le 5 ] && [ "$last" != 401 ] && check "attempt $i is a plain 401" 401 "$last"
done
check "sixth attempt is throttled" 429 "$last"

echo "Known limitation, reported as information"
OLD=$(code -X POST -H "Cookie: $D" -H "Origin: $B" "$B/api/auth/logout"; code -H "Cookie: $D" "$B/api/auth/me")
printf 'INFO  after logout the old cookie answers %s (a stateless session cannot be revoked, see O3)\n' "${OLD: -3}"

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
