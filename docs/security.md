# Security Assessment and Setup Guide

Date of review: 10 October 2026
Scope: the whole repository (Go backend, Next.js frontend, Python ML service, Docker and Cloud Run configuration)
Method: white box review of source and configuration, dependency scanning, and automated unit tests

This document does two jobs. The first half records what a security review of SIRUJUK found, what was fixed, and what is still open. The second half explains how to install the system and set every environment variable safely. If you only want to run the project, skip to "Installation".

## 1. What this review was, and what it was not

I read the code the way an attacker with source access would, then ran the standard scanners against every dependency tree. I did not run a live penetration test against a deployed stack. That means no fuzzing of the running API, no traffic interception, and no load testing. Everything below that says "confirmed" means confirmed by reading the code path or by a passing test, not by exploiting a live server. Section 6 lists the checks you can run yourself against a running stack.

Tools used:

| Area | Tool | Purpose |
|---|---|---|
| Go dependencies and standard library | govulncheck | Known vulnerabilities, filtered by whether our code actually calls them |
| Python dependencies | pip-audit | Known vulnerabilities in requirements.txt |
| Node dependencies | npm audit (production only) | Known vulnerabilities in the frontend |
| Application logic | Manual code review | Authentication, authorization, input handling, secrets, infrastructure |
| Regression safety | go test, jest | Proof that each fix behaves as described |

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
| O1 | Medium | Public backend protected by one shared token | Open |
| O2 | Medium | Patient name and narrative are sent in full to the browser | Open |
| O3 | Low | Sessions are signed cookies that last eight hours | Partly mitigated |
| O4 | Low | Reusing an Idempotency-Key after the result expires can overwrite a referral | Open |
| O5 | Low | Emergency referrals skip synchronous scoring, with a metric but no alert | Open |
| O6 | Low | Model file is a pickle protected by a hash | Accepted with mitigation |

## 3. Findings in detail

### S1. Authentication and authorization (High, fixed)

In the first snapshot the login form only checked password length and then redirected the browser to a page chosen by the user. The scoring proxy accepted anyone and attached the backend token on their behalf, which made the backend token meaningless. All dashboards were reachable without a session.

The current code signs a session cookie with HMAC SHA 256, verifies passwords with scrypt on the backend (a dummy hash keeps the timing the same for unknown emails), uses the `__Host-` cookie prefix in production, and gates every page and every API route by role. The gate lives in `frontend/proxy.ts` and `frontend/lib/auth/guard.ts`, and the backend re-checks the account behind each request through `ActiveActor`, so disabling a user takes effect within minutes instead of at the end of the session. If `AUTH_SECRET` is missing or shorter than 32 characters, every request is refused.

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

## 4. Open risks

O1. The backend has a public URL because Vercel runs outside GCP, and one bearer token protects it. A leaked token lets its holder call the API and claim any identity through `X-Actor`. Calls with no `X-Actor` are treated as service calls and can read everything. Rotate the token regularly. The stronger fix is Vercel OIDC with Workload Identity Federation, so Cloud Run IAM can make the backend private. That is a deployment decision I did not make for you.

O2. List responses still contain the full patient name and clinical narrative. The masking in the interface is cosmetic, because the data has already reached the browser. Fixing it changes the API contract and the edit forms, so it needs the frontend owner.

O3. Sessions are stateless and last eight hours. Because the backend now re-checks the account on every request, a disabled user loses API access quickly, but the cookie itself stays valid until it expires. Rotating `AUTH_SECRET` ends every session at once.

O4. A scoring request that reuses an Idempotency-Key after the stored result has expired can overwrite the existing referral. It should answer 409 instead.

O5. There is no alert when one doctor's emergency share is far above their peers.

O6. The model file is loaded with joblib, which is pickle, so a tampered file means code execution. The loader verifies a SHA 256 hash first. Pin `MODEL_SHA256` from the deployment environment, because the hash file written next to the model only protects against changes after the build.

## 5. Test results

All results below were produced on 10 October 2026 from the current working tree.

| Check | Command | Result |
|---|---|---|
| Go static analysis | `go vet ./...` | Clean |
| Go tests | `go test ./...` | All packages pass |
| Go vulnerabilities | `govulncheck ./...` | 0 vulnerabilities affecting the code |
| Frontend tests | `npx jest` | 6 suites, 36 tests, all pass |
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

This is the local evaluation setup. It starts in development mode with four demo accounts and fifty fake referrals, so nothing here touches real data. Compose refuses to start if `API_TOKEN`, `REDIS_PASSWORD`, `AUTH_SECRET` or `STREAM_ENC_KEY` is missing.

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

## 7. Checks you can run against a live stack

These are the quick manual tests I would run first. I did not execute them against a running deployment as part of this review, so treat them as a checklist rather than results.

1. Request any API route without a cookie, for example `curl -i http://localhost:3000/api/v1/referrals`. Expect 401.
2. Sign in as a verifier and try to audit a red referral. Expect 403 with code `FORBIDDEN_LEVEL`.
3. Send eleven wrong passwords for the same email within fifteen minutes. The eleventh should return 429.
4. With `DEMO_MODE=true` on a production environment, post to `/api/auth/demo`. Expect 404.
5. Open the ML service docs path from inside the network. Expect 404 on `/docs` and `/openapi.json`.
6. Read the backend log after opening a referral. The line should carry the actor and role.

## 8. Reporting a vulnerability

Please do not open a public issue for a security problem. Send the details privately to the project owner, include steps to reproduce and the affected version or commit, and allow reasonable time for a fix before disclosing. Reports that include a proposed patch are welcome.
