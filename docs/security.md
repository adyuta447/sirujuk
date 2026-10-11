# Security Assessment and Setup Guide

Date of review: 10 October 2026 (live tests on 11 October 2026)
Scope: the whole repository (Go backend, Next.js frontend, Python ML service, Docker and Cloud Run configuration)
Method: white box review of source and configuration, dependency scanning, automated unit tests, and live tests against a local Docker Compose stack

This document does two jobs. The first half records what a security review of SIRUJUK found, what was fixed, and what is still open. The second half explains how to install the system and set every environment variable safely. If you only want to run the project, skip to "Installation".

## 1. What this review was, and what it was not

I read the code the way an attacker with source access would, then ran the standard scanners against every dependency tree. After the fixes went in, I built the full stack with Docker Compose on a workstation and attacked it over HTTP with curl, using the four demo accounts and seeded demo referrals. Section 7 records exactly what was sent and what came back.

Two limits matter. First, the live tests ran against a local stack in development mode, not against Vercel, Cloud Run or Firestore, so cloud IAM, TLS and the real account store are covered by review only. Second, there was no fuzzing, no load testing and no traffic interception. Where this document says "confirmed", it means confirmed by a live response or a passing test, and it says which.

Tools used:

| Area | Tool | Purpose |
|---|---|---|
| Go dependencies and standard library | govulncheck | Known vulnerabilities, filtered by whether our code actually calls them |
| Python dependencies | pip-audit | Known vulnerabilities in requirements.txt |
| Node dependencies | npm audit (production only) | Known vulnerabilities in the frontend |
| Application logic | Manual code review | Authentication, authorization, input handling, secrets, infrastructure |
| Regression safety | go test, jest | Proof that each fix behaves as described |
| Live behaviour | Docker Compose, curl, redis-cli | Real responses from the running stack, including role checks, throttling and queue contents |

## 2. Summary of findings

Severity follows the usual meaning: High means a realistic path to data exposure or fraud bypass, Medium means a real weakness that needs another condition to hurt, Low means hardening.

| ID | Severity | Finding | Status |
|---|---|---|---|
| S1 | High | No real authentication or role enforcement in the first snapshot | Fixed |
| S2 | High | Fraud detection could be skipped with a client supplied emergency flag | Partly mitigated |
| S3 | Medium | No throttling on expensive endpoints, unbounded queue growth | Partly fixed |
| S4 | Medium | Known vulnerable dependencies (Starlette, Go standard library) | Fixed |
| S5 | Medium | Weak login throttling that could be bypassed | Fixed |
| S6 | Medium | Passwordless demo login could be enabled in production | Fixed |
| S7 | Medium | A verifier could edit a red referral until it turned yellow, then process it | Fixed |
| S8 | Medium | No trail of who opened or changed patient data | Fixed |
| S9 | Low | Origin check and body size check were weaker than they looked | Fixed |
| S10 | Low | Hardening items (API docs exposed, duplicate root Dockerfiles, a crash on bad config) | Fixed |
| S11 | Medium | Redis could not start under the hardened compose file, which silently switched off two protections | Fixed |
| S12 | High | With more than one Cloud Run instance, audits could be invisible to other instances and then overwritten | Interim fix, permanent fix pending |
| S13 | Medium | Demo accounts created before expiries existed never expire | Fixed in code, accounts still exist |
| S14 | Low | The in memory login limiter could be reset by flooding it with unique emails | Fixed |
| O1 | Medium | Public backend protected by one shared token | Open |
| O2 | Medium | Patient name and narrative are sent in full to the browser | Open |
| O3 | Low | Sessions are signed cookies that last eight hours, and logout does not revoke them | Partly mitigated |
| O4 | Low | Reusing an Idempotency-Key after the result expires can overwrite a referral | Open |
| O5 | Low | Emergency referrals skip synchronous scoring, with a metric but no alert | Open |
| O6 | Low | Model file is a pickle protected by a hash | Accepted with mitigation |
| O7 | High | Most fixes in this document are in the repository, not in production | Open |

## 3. Findings in detail

### S1. Authentication and authorization (High, fixed)

In the first snapshot the login form only checked password length and then redirected the browser to a page chosen by the user. The scoring proxy accepted anyone and attached the backend token on their behalf, which made the backend token meaningless. All dashboards were reachable without a session.

The current code signs a session cookie with HMAC SHA 256, verifies passwords with scrypt on the backend (a dummy hash keeps the timing the same for unknown emails), uses the `__Host-` cookie prefix in production, and gates every page and every API route by role. The gate lives in `frontend/proxy.ts` and `frontend/lib/auth/guard.ts`, and the backend re-checks the account behind each request through `ActiveActor`, so disabling a user takes effect within about 30 seconds instead of at the end of the session. If `AUTH_SECRET` is missing or shorter than 32 characters, every request is refused.

### S2. Fraud detection bypass through is_emergency (High, partly mitigated)

The emergency flag comes from whoever issues the referral. Setting it to true sends the referral to the retry queue instead of scoring it synchronously. Originally nothing consumed that queue, so those referrals were never scored at all. Separately, if the ML service is slow, the backend fails open after 300 milliseconds by design, so an attacker who can slow the ML service can let referrals through unscored.

What changed: a consumer now scores queued referrals with retries and a dead letter stream, the queue is capped, and `/api/v1/stats` reports the emergency count and share per doctor (`darurat`, `persen_darurat`). What remains: there is no threshold or alert on that share, so a doctor who marks most referrals as emergencies is visible only to someone who looks. See O5.

### S3. Resource exhaustion (Medium, partly fixed)

The scoring path calls the ML service and Redis for every request, and the retry stream originally had no length cap. Together with the memory limit and `allkeys-lru` eviction in Redis, a flood of emergency referrals could evict cached doctor features and push later scores toward the cold start value. The stream now has a maximum length, Cloud Run caps instances, and the login endpoint is throttled (S5). A general per user rate limit on the scoring route has not been added.

### S4. Vulnerable dependencies (Medium, fixed)

Results of the first scan against the original snapshot, and of the rerun on 10 October 2026:

| Component | First scan | Rerun |
|---|---|---|
| Python, Starlette 0.41.3 through FastAPI 0.115.6 | 7 distinct advisories: CVE-2025-54121, CVE-2025-62727, CVE-2026-48710, CVE-2026-48817, CVE-2026-48818, CVE-2026-54282, CVE-2026-54283 | No known vulnerabilities (FastAPI 0.143.0) |
| Go standard library on Go 1.25.5 | 26 reachable advisories, including HTTP/2 memory exhaustion (CVE-2026-78659), HTTP/2 server crash (CVE-2026-97032), TLS issues (CVE-2025-68121, CVE-2026-32283) and several crypto/x509 denial of service issues | 0 affecting our code on Go 1.26.9 |
| Go modules we require | 13 not reachable from our code | 1 not reachable from our code |
| Docker base image | golang 1.23, which is end of life | golang 1.26 |
| Node production dependencies | 0 of 578 | 0 |

The one remaining Go advisory sits in a module we depend on but never call. govulncheck reports it for awareness only. CI runs govulncheck, pip-audit and npm audit on every push, with action versions pinned to commit SHAs.

### S5. Login throttling (Medium, fixed)

The first limiter lived in process memory, which does nothing useful when Cloud Run runs several instances. It also keyed on the first value of `X-Forwarded-For`, which a client can forge outside a trusted proxy, so rotating that header reset the counter. Because the backend URL is public, anyone holding the service token could also call the verify endpoint directly and skip the frontend entirely.

Now the backend counts every attempt per email in Redis and answers 429 with `Retry-After` after ten attempts in fifteen minutes. The frontend key is the email alone. The trade off is that an attacker can lock a known account for fifteen minutes. I accepted that over leaving passwords open to guessing. If Redis is unreachable the limiter fails open and logs the error, because locking every verifier out during an outage is worse for this system.

### S6. Passwordless demo login (Medium, fixed)

`DEMO_MODE=true` gives one click login to any role. The backend already refused demo accounts when `APP_ENV=production`, but the frontend had no matching guard, so a stray variable on a Vercel production deployment would have opened the door. The helper `demoAktif()` now returns false on Vercel production or when `APP_ENV=production`, and both the login page and the demo route use it. Demo sessions carry the email of a real demo account, so the backend actor check accepts them in non production environments.

### S7. Editing red referrals (Medium, fixed)

Officers can edit the clinical fields of a referral and re-score it. A verifier could lower a red score by editing the evidence, then process the case alone, even though red cases belong to TKMKB. The role check now runs on the server for both the audit and the edit routes, based on the stored decision and never on anything the client sends. The backend enforces the same rule independently, so a bug in one layer does not open the other.

### S8. Accountability (Medium, fixed)

The proposal requires knowing who opened patient data. The frontend now forwards the signed in user as `X-Actor` and `X-Actor-Role`, the backend validates both against a strict allow list (which also blocks log injection), and the request log includes them. Updates, re-scores, archives, audits and clarifications write their own log lines. Edits record only the names of the fields that changed, never their values. Requests rejected with 401 are logged without an actor because their headers were never authenticated. The stored audit rows can be lost on a restart in the demo store, so these log lines are the durable trail until a database holds them.

### S9. Origin and body checks (Low, fixed)

The old origin check passed any request that simply omitted the Origin header. State changing routes now require an Origin that matches the Host header. Body size was checked only after the whole body had been read into memory, so routes now reject on `Content-Length` first and the backend still enforces its own limit.

### S10. Hardening items (Low, fixed)

1. FastAPI interactive docs and the OpenAPI schema are switched off, since the ML service is private.
2. Two unused Dockerfiles that ran as root and skipped hash verification were removed.
3. A malformed `REDIS_URL` used to panic inside the client constructor. It now returns an error.
4. Queued referrals are encrypted with `STREAM_ENC_KEY` before they reach Redis, and production refuses to start without the key.

### S11. Redis did not start under the hardened compose file (Medium, fixed)

This one only showed up when I ran the stack. The Redis service drops every Linux capability and starts through `sh -c`. The official image drops root privileges only when the command is a bare `redis-server`, so here Redis ran as root without the capability that lets root write into a directory owned by another user. It could not create its append only file, exited, and Docker restarted it in a loop.

The security impact is the interesting part. The backend does not crash when Redis is down. It carries on, and several protections quietly turn off: the shared login throttle fails open by design, the retry queue stops, and doctor features cannot be cached. A broken hardening setting looked like a working system. The fix is one line, `user: redis`, on the Redis service in `docker-compose.yml`. I rebuilt from an empty volume and confirmed that Redis starts, accepts the password, and holds the throttle counters and the encrypted queue. If you run an older volume created by a root owned Redis, change its ownership once or delete the volume.

### S12. Audit trail integrity across instances (High, interim fix)

The backend keeps referral state, including audits and clarifications, in memory and loads it from Firestore once at start. The Cloud Run service was allowed to scale to three instances. That breaks the audit trail in two ways. A verifier saves an audit on instance A, and a TKMKB member who lands on instance B does not see it, so a decision to hold or release a claim can be made without the earlier audit. Worse, if B then writes its own audit, it saves a copy of the referral that does not contain A's audit, and A's audit is lost for good. For a system whose value is a reliable record of who decided what, this is the finding I would fix before any pilot.

Interim fix: `maxScale` in `infra/gcp/cloudrun-go.yaml` is now 1, with a comment that says why and when it may be raised. One instance means one copy, so neither failure can happen. The cost is no horizontal scaling and no spare instance during a deploy, which is acceptable for a proof of concept.

Permanent fix: a separate change in the working tree makes every write read the newest document, apply the change on top, and save with a version check that Firestore enforces, retrying when another instance wrote first. It also refreshes the in memory copy every few seconds so reads converge. That change was not merged when I wrote this. Raise `maxScale` again only after it is merged, deployed, and tested with two instances running: save an audit through one, read it through the other, and write from both at once.

### S13. Demo accounts that never expire (Medium, fixed in code)

Demo accounts now get a seven day expiry when they are created. The four demo accounts that already exist in the production Firestore were created before that, so they have no expiry and would have worked forever. Their passwords were random and shown once, but an account that nobody owns is still a door.

The fix is a rule in `domain.User.Expired`: the domain `@demo.sirujuk.id` is reserved for demo accounts, and an account there without an expiry counts as expired. Login and the per request actor check both use that function, so the old accounts stop working as soon as this code is deployed, with no change to the data. The local demo accounts created by `DEMO_ACCOUNTS=true` now carry the same seven day expiry so local use still works. A test proves that a demo account with a correct password but no expiry is refused. The accounts themselves still exist; see the runbook in section 11 to disable or renew them.

### S14. Resetting the fallback login limiter (Low, fixed)

When Redis is unreachable, the limiter counts in memory instead. The first version emptied the whole map once it passed 5000 keys, so an attacker who sent 5000 different emails reset the count of the account they were really attacking. The backend now drops expired windows first and then only keys with a single attempt, which is what a flood of unique emails produces, so an account under real guessing keeps its count. The frontend limiter received the same treatment in `lib/auth/pembatas.ts`, and each has a test. One small residual remains: an attacker who sends two attempts per fake email keeps those entries alive and can grow the map past its cap slowly. That needs Redis to be down and costs the attacker thousands of requests, so I left it.

## 4. Open risks

O1. The backend has a public URL because Vercel runs outside GCP, and one bearer token protects it. A leaked token lets its holder call the API and claim any identity through `X-Actor`. Calls with no `X-Actor` are treated as service calls and can read everything; I confirmed this live, where the backend answered 200 for a token without an actor header while it refused an unknown actor and a mismatched role with 403. Rotate the token regularly. The stronger fix is Vercel OIDC with Workload Identity Federation, so Cloud Run IAM can make the backend private. That is a deployment decision I did not make for you.

O2. List responses still contain the full patient name and clinical narrative. The masking in the interface is cosmetic, because the data has already reached the browser. Fixing it changes the API contract and the edit forms, so it needs the frontend owner.

O3. Sessions are stateless and last eight hours. Because the backend now re-checks the account on every request, a disabled user loses API access quickly, but the cookie itself stays valid until it expires. Logout only clears the cookie in the browser: I replayed an old cookie after calling logout and the server still answered 200. Rotating `AUTH_SECRET` ends every session at once.

O4. A scoring request that reuses an Idempotency-Key after the stored result has expired can overwrite the existing referral. It should answer 409 instead.

O5. There is no alert when one doctor's emergency share is far above their peers.

O6. The model file is loaded with joblib, which is pickle, so a tampered file means code execution. The loader verifies a SHA 256 hash first. Pin `MODEL_SHA256` from the deployment environment, because the hash file written next to the model only protects against changes after the build.

O7. A fix in the repository protects nobody until it is deployed. I was told, and could not verify from here, that production still runs an old revision, that its readiness endpoint reports Redis as down, that the data encryption key is not configured, and that the secret `sirujuk-data-key` does not exist in GCP. If that is accurate, the production service has none of the access control, throttling, logging, encryption or expiry changes described above. The in memory fallbacks keep the service running while Redis is down, but they hide the problem and they work per instance only. The steps are to provide the Upstash Redis URL, run `infra/gcp/setup.sh` so the secrets exist, uncomment the `DATA_ENC_KEY` lines in `infra/gcp/cloudrun-go.yaml`, and deploy. Keep the data key safe: if it is lost, the sealed referrals in Firestore cannot be read again. After the deploy, repeat the checks in section 7 against the real environment, because everything in that section ran locally.

## 5. Test results

All results below were produced on 10 October 2026 from the current working tree.

| Check | Command | Result |
|---|---|---|
| Go static analysis | `go vet ./...` | Clean |
| Go tests | `go test ./...` | All packages pass |
| Go vulnerabilities | `govulncheck ./...` | 0 vulnerabilities affecting the code |
| Frontend tests | `npx jest` | 7 suites, 41 tests, all pass |
| Frontend types | `npx tsc --noEmit` | Clean |
| Node vulnerabilities | `npm audit --omit=dev` | 0 vulnerabilities |
| Python vulnerabilities | `pip-audit -r requirements.txt` | No known vulnerabilities |

Tests that exist specifically because of this review:

1. Login throttle: the eleventh attempt for one email returns 429 with `Retry-After`; the Redis counter starts its window on the first hit and resets after it.
2. Actor header: forged roles, spaces, empty values and log injection strings are all rejected.
3. Edit log: the changed field names come back sorted and never contain values.
4. Emergency share: a doctor with two emergencies out of four referrals reports 50 percent.
5. Demo guard: off by default, off on Vercel production and `APP_ENV=production`, on only with `DEMO_MODE=true` elsewhere.
6. Red referral rule: a verifier is refused on red, allowed on yellow, TKMKB is never delayed by a lookup, and an unreadable or malformed referral fails closed.
7. Body limit: an oversized `Content-Length` is rejected without reading the body.

## 6. Installation

### Requirements

1. Git and OpenSSL.
2. Docker 24 or newer with Docker Compose v2 (the easiest route).
3. Only if you run services outside Docker: Go 1.26, Node 22, Python 3.12.

### Step 1. Get the code

```bash
git clone <your repository url> sirujuk
cd sirujuk
```

### Step 2. Create the secrets

Generate every secret yourself. Never reuse a value between environments and never commit `.env`; it is already git ignored.

```bash
{
  echo "APP_ENV=development"
  echo "API_TOKEN=$(openssl rand -hex 32)"
  echo "REDIS_PASSWORD=$(openssl rand -hex 24)"
  echo "AUTH_SECRET=$(openssl rand -hex 32)"
  echo "STREAM_ENC_KEY=$(openssl rand -hex 32)"
  echo "ALLOW_CLIENT_CONTEXT=false"
  echo "FIRESTORE_PROJECT="
  echo "DEMO_ACCOUNTS=true"
  echo "SEED_COUNT=50"
} > .env
```

This is the local evaluation setup. It starts in development mode with four demo accounts and fifty fake referrals, so nothing here touches real data. If you plan to run the live checks in section 7, set `SEED_COUNT=200` so the seed has a better chance of containing a red referral. Compose refuses to start if `API_TOKEN`, `REDIS_PASSWORD`, `AUTH_SECRET` or `STREAM_ENC_KEY` is missing.

### Step 3. Start the stack

```bash
docker compose up --build
```

Only the frontend is published, on port 3000. The backend, ML service and Redis stay on the internal Docker network. Open `http://localhost:3000/login` and sign in with a demo account from `docs/demo.md`. Chrome accepts the Secure cookie on localhost; Safari does not, so use `npm run dev` inside `frontend` if you work in Safari.

### Step 4. Run the checks

```bash
cd backend-go && go vet ./... && go test ./...
cd ../frontend && npm ci && npx tsc --noEmit && npx jest
pip install pip-audit && pip-audit -r ../ml-service/requirements.txt
```

### Production setup

Production differs from the local setup in five ways. Set `APP_ENV=production` and leave `DEMO_ACCOUNTS`, `SEED_COUNT` and `DEMO_MODE` empty, because the backend refuses demo accounts in production. Set `FIRESTORE_PROJECT` so accounts, referrals and audits persist. Provide `API_TOKEN` (at least 32 characters) and `STREAM_ENC_KEY`, since the backend will not start without them. Create real accounts with the command below, which prompts for a password of at least twelve characters through the `SANDI` variable.

```bash
cd backend-go
SANDI='use-a-long-unique-password' go run ./cmd/useradd -project <gcp project id> -email name@agency.id -nama "Full Name" -role verifikator
```

The GCP bootstrap is in `infra/gcp/setup.sh` and the pipeline in `.github/workflows/deploy.yml`; `docs/deploy.md` walks through both. The frontend runs on Vercel with its own variables (see below), and its Preview environment is the right place for any demo.

### Environment variable reference

| Variable | Used by | Required | Notes |
|---|---|---|---|
| APP_ENV | backend, frontend | Yes | `production` turns on the strict checks. Anything else is treated as development. |
| API_TOKEN | backend, frontend | Yes | Shared service token, at least 32 characters. `openssl rand -hex 32`. Rotate it regularly. |
| AUTH_SECRET | frontend | Yes | Signs the session cookie, at least 32 characters. Changing it logs everyone out. |
| STREAM_ENC_KEY | backend | Yes in production | 64 hex characters. Encrypts queued referrals in Redis. `openssl rand -hex 32`. |
| REDIS_PASSWORD | Redis, compose | Yes with compose | `openssl rand -hex 24`. Compose builds `REDIS_URL` from it. |
| REDIS_URL | backend | Cloud Run | Full connection string, stored in Secret Manager as `sirujuk-redis-url`. |
| BACKEND_URL | frontend | Yes | Internal URL under compose, the Cloud Run URL on Vercel. Never prefix it with `NEXT_PUBLIC_`. |
| FIRESTORE_PROJECT | backend | Yes in production | Empty means accounts live in memory, which is for local use only. |
| ML_SERVICE_URL | backend | Yes | Set by compose and by the deploy pipeline. |
| ML_AUTH | backend | Cloud Run | Set to `cloudrun` so the backend sends a Google ID token to the private ML service. |
| CORS_ORIGIN | backend | Optional | The single dashboard origin allowed to call the API. Defaults to `http://localhost:3000`. |
| ALLOW_CLIENT_CONTEXT | backend | Optional | Keep `false`. When true, the client can supply doctor history and lower its own risk score. Demo only. |
| MIN_RED_LAYERS | backend | Optional | Number of independent layers that must agree before a claim is marked red. `1` trusts the model, `2` is recommended. |
| KNS_FILE | backend | Optional | Path to the 144 diagnosis list. Compose mounts it for you. |
| MODEL_SHA256 | ML service | Recommended | Pin the expected model hash from outside the image. |
| DEMO_ACCOUNTS | backend | Local only | Creates four demo accounts with a public password. Refused in production. |
| SEED_COUNT | backend | Local only | Number of fake referrals for the demo list. |
| DEMO_MODE | frontend | Local or Preview only | One click role login. Ignored on Vercel production and when `APP_ENV=production`. |
| DUMMY_SCORING | backend | Never in production | Replaces ML scores with a heuristic. The backend refuses to start with it in production. |

## 7. Live test results

Setup: Docker Compose from this repository, `APP_ENV=development`, `DEMO_ACCOUNTS=true`, seeded demo referrals, port 3000 as the only published port, requests sent with curl over plain HTTP to localhost. The production cookie carries the Secure flag, so I copied it into a Cookie header by hand. All secrets were generated for the test and deleted afterwards, and the containers and volumes were removed.

### Access control

| Test | Expected | Result |
|---|---|---|
| GET referrals, stats and /api/auth/me without a session | 401 | 401 on all three |
| POST score without a session | 401 | 401 |
| Open /dashboard, /audit, /dinkes, /klarifikasi, /referral/r-001 without a session | Redirect to /login | 307 to /login on all five |
| Session cookie with the role edited to tkmkb but the old signature | Rejected | 401 |
| Dinkes account lists referrals | 403 | 403 |
| Dinkes account reads stats | Region totals only | 200, 5 regions, 0 per doctor rows |
| Doctor account reads stats | 403 | 403 |
| Doctor opens /dashboard and /dinkes | Redirect | 307 on both |
| Doctor lists referrals | Own referrals only | 2 of 30, all belonging to d-001 |
| Doctor audits, edits and archives another doctor's referral | 403 | 403 on each |
| Officer account lists referrals | Everything | All 30 across six doctors |

### The red referral rule

This ran in the first live session, where the seed contained a red referral (r-026) and a yellow one (r-022).

| Test | Expected | Result |
|---|---|---|
| Verifikator audits a red referral | 403 | 403 |
| TKMKB audits the same red referral | 201 | 201 |
| Verifikator audits a yellow referral | 201 | 201 |
| Verifikator edits a red referral | 403 | 403 |

The seed data is random. In later sessions it produced no red referral at all, so the repeatable script reports these checks as skipped instead of failing. The same rule is covered by unit tests on both the frontend and the backend.

### Request integrity

| Test | Expected | Result |
|---|---|---|
| State changing request with no Origin header | 403 | 403 |
| Same request with Origin https://evil.example | 403 | 403 |
| Same request with the correct Origin | 201 | 201 |
| Score request with a 100 KB body | 413 | 413 |

### Login throttle

Every test used an email that does not exist, so no real account was locked.

| Test | Expected | Result |
|---|---|---|
| Five wrong passwords, then a sixth | Sixth is throttled | 401 five times, then 429 |
| Restart the frontend container (clears its memory counter), five more wrong passwords, restart again, one more attempt | The backend limiter, which lives in Redis, throttles on its own | 401 five times, then 429 from the backend |
| A different email after that | Not affected | 401 |
| Throttle keys in Redis | No plain emails | Keys are SHA 256 hashes |

### Backend, ML service and Redis

These calls were made from inside the Docker network, because only the frontend is published.

| Test | Expected | Result |
|---|---|---|
| Backend /health without a token | 200 | 200 |
| Backend API without a token, and with a wrong token | 401 | 401 and 401 |
| Valid token and a valid actor | 200 | 200 |
| Valid token and an actor that does not exist | 403 | 403 |
| Valid token and a role that does not match the account | 403 | 403 |
| Valid token and no actor at all | Service call | 200, can read everything (see O1) |
| ML service /docs and /openapi.json | 404 | 404 and 404 |
| Host ports 6379 and 8000 | Closed | Closed |
| Redis PING without a password | NOAUTH | NOAUTH |
| Redis CONFIG and FLUSHALL with the password | Unknown command | Unknown command on both |

### Data protection and accountability

| Test | Expected | Result |
|---|---|---|
| Submit an emergency referral with a recognisable patient name and narrative, then read the retry stream in Redis | Encrypted payload | One entry with a `referral_enc` field; no match for the name, the narrative or the diagnosis code |
| Backend log for a referral read | Actor and role present | Yes, for example `"actor":"verifikator@demo.sirujuk.id","role":"verifikator"` |
| Backend log for a rejected request | No actor | `"actor":"","role":""` on every 401 line |
| Backend log for a forged actor | Recorded with the refusal | `ghost@demo.sirujuk.id` with status 403 |
| Audit and edit events | Durable log lines | `audit_recorded` lines with actor, role and outcome |

### Response headers on the login page

Content-Security-Policy with a fresh nonce and strict-dynamic, X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, a restrictive Permissions-Policy, and Strict-Transport-Security. X-Powered-By is not sent.

### Things the live tests did not pass

1. Logout does not revoke a session. The old cookie still answered 200 after logout (O3).
2. Redis crashed on start until the compose file was fixed (S11).

### Repeating the tests

The HTTP checks above are in `tests/security/live_checks.sh`. Start the stack with demo accounts and a seed of 200 referrals, then run it:

```bash
BASE=http://localhost:3000 bash tests/security/live_checks.sh
```

It prints PASS or FAIL for each check and exits with a non zero code if any check fails. It writes audit rows, so it refuses to run against anything except localhost unless you set `CONFIRM=yes`. The last run on 11 October 2026 gave 20 passed and 0 failed, with the red referral checks skipped because that seed had no red case.

If the Docker build fails with DNS errors or timeouts while downloading npm or pip packages, it is a network problem inside Docker and not a project problem. Run the same command again, because the layers that finished are cached.

## 8. Attack surface and trust boundaries

Four zones matter. The browser is untrusted. The Next.js server is trusted to authenticate users and to speak for them. The Go backend is trusted to enforce rules and to log. The ML service, Redis and Firestore are internal and are reachable only from the backend.

| Entry point | Who can reach it | Protection |
|---|---|---|
| Frontend pages | The internet | Signed session cookie, role check in `proxy.ts`, per request CSP nonce |
| Frontend API routes under /api/v1 | The internet | Session, role check, same origin check on writes, body limits |
| /api/auth/login | The internet | scrypt verification, constant work for unknown emails, per email throttle at two layers |
| /api/auth/demo | The internet | Returns 404 unless `DEMO_MODE=true` and the deployment is not production |
| Backend API | The internet (public Cloud Run URL) | Bearer token, then the actor check against the account store on every request |
| ML service | The backend only | Cloud Run IAM with a Google ID token, no public invoker |
| Redis | The backend only | Password, dangerous commands renamed, queued referrals encrypted with AES 256 GCM |
| Firestore | The backend service account | `roles/datastore.user` on that account only |
| CI/CD | GitHub Actions on main | Keyless OIDC into GCP limited to this repository and branch, actions pinned to commit SHAs, vulnerability gates |

## 9. Mapping to OWASP Top 10 (2021) and CWE

| ID | OWASP category | CWE |
|---|---|---|
| S1 | A01 Broken Access Control, A07 Identification and Authentication Failures | CWE-306, CWE-862, CWE-285 |
| S2 | A04 Insecure Design | CWE-807 |
| S3 | A04 Insecure Design | CWE-770 |
| S4 | A06 Vulnerable and Outdated Components | CWE-1104 |
| S5 | A07 Identification and Authentication Failures | CWE-307, CWE-348 |
| S6 | A05 Security Misconfiguration | CWE-1188 |
| S7 | A01 Broken Access Control | CWE-863 |
| S8 | A09 Security Logging and Monitoring Failures | CWE-778 |
| S9 | A01 Broken Access Control, A05 Security Misconfiguration | CWE-352, CWE-400 |
| S10 | A05 Security Misconfiguration | CWE-16 |
| S11 | A05 Security Misconfiguration | CWE-16, CWE-636 |
| S12 | A04 Insecure Design | CWE-362 |
| S13 | A07 Identification and Authentication Failures | CWE-262 |
| S14 | A07 Identification and Authentication Failures | CWE-307 |
| O1 | A07 Identification and Authentication Failures | CWE-287 |
| O2 | A01 Broken Access Control | CWE-359 |
| O3 | A07 Identification and Authentication Failures | CWE-613 |
| O4 | A04 Insecure Design | CWE-841 |
| O5 | A09 Security Logging and Monitoring Failures | CWE-778 |
| O6 | A08 Software and Data Integrity Failures | CWE-502 |
| O7 | A06 Vulnerable and Outdated Components | CWE-1104 |

## 10. Logging reference

The backend writes one JSON line per request with the method, path, status, duration, correlation id, actor and role. It never writes request bodies, passwords or emails from login attempts. The path carries the referral id, so a GET on a referral is the record of who opened it.

Event lines you will want to search or alert on:

| Event | Meaning |
|---|---|
| audit_recorded | A reviewer saved an outcome. Detail holds the outcome only. |
| referral_updated | Clinical fields were edited. Detail lists the field names, never the values. |
| referral_rescored | A referral was scored again. |
| referral_archived | A referral was archived by TKMKB. |
| clarification_added | A doctor added an explanation. |
| score_async | A referral went to the retry queue, with the reason (emergency or scoring unavailable). |
| score_dlq | A queued referral failed three times and moved to the dead letter stream. |
| login_limiter_error | Redis was unreachable, so the login throttle failed open. |
| auth_store_error | The account store was unreachable during login. |

Two searches are worth saving. Any 200 response with an empty actor on a path other than `/api/v1/auth/verify` is a call made with the service token alone and deserves a look, because that is what a leaked token would produce. A doctor with a share of `score_async` events for emergencies far above the rest is the pattern described in S2.

## 11. Key rotation and incident response

| Secret | How to rotate | Effect |
|---|---|---|
| API_TOKEN | Add a new version in Secret Manager (`sirujuk-api-token`), set the same value in the Vercel environment, redeploy both | Requests fail briefly while the two sides disagree, so do it in a quiet window |
| AUTH_SECRET | Change it in Vercel and redeploy | Every session ends and everyone must sign in again |
| REDIS_PASSWORD or REDIS_URL | Update the secret and redeploy the backend and Redis together | Short interruption of the queue and the login throttle |
| STREAM_ENC_KEY | Let the retry stream and the dead letter stream drain first, then change the key and redeploy | There is a single key with no key id in the format, so entries sealed with the old key cannot be opened after the change |
| A user account | `go run ./cmd/useradd -project <id> -disable <email>` | Login and live sessions stop within about 30 seconds |
| The four old demo accounts | See the paragraph below | They stop at once after this code is deployed, and can be renewed or disabled |

If you suspect the service token leaked, rotate `API_TOKEN` first and ask questions afterwards. Then read the backend logs for the period since the suspected leak, using the empty actor search above. If you suspect a stolen session cookie, disable the account, then rotate `AUTH_SECRET` if you cannot tell which cookies are affected, because logout alone does not invalidate a cookie. For the four demo accounts that were created before expiries existed (`verifikator@`, `tkmkb@`, `dinkes@` and `dokter@demo.sirujuk.id`), choose one of two paths. To retire them, run `useradd -disable` for each address. To keep a demo alive for a week, run `go run ./cmd/useradd -project <id> -demo`, which writes the four accounts again with a random password shown once and an expiry seven days out. Either way, check afterwards that a login with an old password returns 401. Disabling is the safer default when no demo is planned.

Set the Cloud Logging retention to match your policy before real data arrives, since the log lines are currently the only durable audit trail.

## 12. Recommended next steps

In rough order of value:

1. Deploy what is already in the repository and verify it in the real environment (O7). Merge the versioned writes for the referral store, test with two instances, and only then raise `maxScale` (S12).
2. Make the backend private, or bind the token to Vercel OIDC through Workload Identity Federation, and treat a request without an actor as no access in production (O1).
3. Stop sending the full patient name and the narrative in list responses, and mask names on the server (O2).
4. Answer 409 when an Idempotency-Key is reused for a referral that already exists (O4).
5. Add server side session revocation, for example a session id with a deny list in Redis, and shorten the lifetime (O3).
6. Alert on the emergency share per doctor and on token only requests (O5, O1).
7. Add a per user rate limit on the scoring route (S3).
8. Run an automated scan such as the OWASP ZAP baseline against the compose stack in CI, and add image scanning for the Docker builds.
9. Pin `MODEL_SHA256` from the deployment environment (O6).
10. Before any real patient data, commission an independent penetration test against the deployed environment, including TLS, IAM and the real account store.

## 13. Limitations of this review

The review reflects the repository as it was on 10 October 2026, and the code changed while I worked because other people were editing it, so a later commit can invalidate a statement here. I did not test the deployed Vercel, Cloud Run or Firestore environments, I did not test TLS configuration, and I did not run fuzzing or load tests. The ML model quality is outside this document: the project reports accuracy figures measured on synthetic data, and those are not evidence of fraud detection performance in the field. A clean scan means no known vulnerability in the databases I queried on that day, not the absence of vulnerabilities.

## 14. Reporting a vulnerability

Please do not open a public issue for a security problem. Send the details privately to the project owner, include steps to reproduce and the affected version or commit, and allow reasonable time for a fix before disclosing. Reports that include a proposed patch are welcome.
