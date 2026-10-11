# SIRUJUK Backend

This document describes the Go backend of SIRUJUK Anti Fraud: what it does, how to install and run it, which environment variables it reads, and what the tests showed when I ran them. It is written for whoever has to run, review or extend the service next. The endpoint contract lives in `api-contract.md`, and the open product and proposal questions live in `proposal-gaps.md`.

## What the backend is responsible for

A referral is issued by a doctor at a primary clinic (FKTP) and sent to a hospital (FKRTL). The backend receives that referral, asks the ML service for a risk score, turns the answer into a recommendation (green, yellow or red), stores everything needed to explain the score later, and exposes the cases to the people who review them.

Three rules shaped most of the code.

First, scoring must never block patient care. The scoring call has a 300 ms budget. If the ML service is slow or down, the referral goes through, the API answers 202, and the referral is queued for scoring later. A red result holds the claim payment, not the patient.

Second, people decide, the model does not. The backend produces scores and recommendations. A final decision on a case is written only by a signed in verifier or TKMKB member, and a final decision on a red case is reserved for TKMKB.

Third, every score has to be explainable months later. Each stored score keeps the model version, the cut-offs the model used, the exact doctor and facility features it saw, the indicators and the reason codes.

## Architecture in one picture

```
Browser -> Next.js (session, role checks, adds service token and X-Actor headers)
        -> Go backend -> ML service (FastAPI, private)
                      -> Redis (batch features, retry queue, idempotency, login limiter)
                      -> Firestore (accounts, referrals, audits, clarifications)
```

Only the Next.js server talks to the backend, and it does so with a shared service token. It also forwards the signed in user as `X-Actor` (email) and `X-Actor-Role`. The backend re-checks that account on every request, so a disabled account or a changed role takes effect within about 30 seconds, not at the end of the 8 hour session.

The ML service owns the score and the category. The backend keeps no cut-off of its own. It prepares the inputs (doctor features from a batch job, the SISRUTE snapshot, the narrative), forwards the answer, and stores it.

## Requirements

You need Docker with Compose v2 for the full stack, or Go 1.26.9 or newer if you want to run the backend alone. For the ML service outside Docker you need Python 3.13 and the packages in `ml-service/requirements.txt` and `requirements-train.txt`. The ML model is trained when its image is built, so the first build takes a few minutes.

## Install and run with Docker

From the repository root, create the `.env` file with fresh random values and start the stack:

```
sh infra/local-env.sh
docker compose up --build
```

Then open http://localhost:3000/login. The script refuses to overwrite an existing `.env`. Use Chrome or Firefox; Safari may reject the session cookie on plain http://localhost.

If you prefer to write the file by hand, create `.env` in the repository root with these lines and replace each placeholder with the output of the `openssl` command shown in the comment:

```
APP_ENV=development
API_TOKEN=...          # openssl rand -hex 32
REDIS_PASSWORD=...     # openssl rand -hex 24
AUTH_SECRET=...        # openssl rand -hex 32
STREAM_ENC_KEY=...     # openssl rand -hex 32
DEMO_ACCOUNTS=true
SEED_COUNT=200
```

`APP_ENV=development` is required for a demo. Compose defaults to `production`, and in that mode the backend refuses demo accounts and sample data and exits at startup. Do not reuse production secrets in this file.

## Run the backend without Docker

Start the ML service first (from `ml-service`, after `python train.py`), then the backend:

```
cd backend-go
KNS_FILE=../ml-service/app/ml/data/kns144.tsv \
SPECIALIST_FILE=../ml-service/app/ml/data/specialist.tsv \
APP_ENV=development DEMO_ACCOUNTS=true SEED_COUNT=200 \
API_TOKEN=devtoken GO_PORT=18080 go run ./cmd
```

Redis is optional in development. Without it the service still scores, but batch doctor features, idempotent replays, the async queue and the shared login limiter are off. The startup log says so, and `GET /ready` reports it.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_ENV` | yes in compose | `production` enables the strict checks below. Use `development` for demos. |
| `API_TOKEN` | yes in production, 32+ characters | Shared bearer token held by the Next.js server. |
| `AUTH_SECRET` | frontend | Signs the session cookie. Login is refused without it. |
| `REDIS_URL` / `REDIS_PASSWORD` | recommended | Cache, queue, idempotency, login limiter. |
| `STREAM_ENC_KEY` | yes in production | 64 hex characters. Encrypts queued referrals (AES-256-GCM). |
| `DATA_ENC_KEY` | recommended in production | 64 hex characters. Seals each referral document (patient name, narrative, scores) before it is written to Firestore. |
| `FIRESTORE_PROJECT` | yes in production | Stores accounts, referrals, audits and clarifications. |
| `ML_SERVICE_URL` | yes | Address of the ML service. |
| `ML_AUTH` | Cloud Run | Set to `cloudrun` to call a private ML service with an ID token. |
| `KNS_FILE` | no | Path to the 144 diagnosis table. Defaults to the copy compiled into the binary. |
| `MIN_RED_LAYERS` | no | Default 1. Set 2 so that red needs two independent layers. |
| `ALLOW_CLIENT_CONTEXT` | no | Default false. Only for demos: trusts doctor history sent by the client. |
| `DEMO_ACCOUNTS` | no | Creates four in-memory demo accounts. Refused in production. |
| `SEED_COUNT` | no | Creates synthetic referrals. Refused in production or with Firestore set. |
| `SPECIALIST_FILE` | no | Specialist diagnosis table used only by the demo seed. |
| `CORS_ORIGIN` | no | Default `http://localhost:3000`. |
| `GO_PORT` | no | Default 8080. |

In production the backend refuses to start without a strong `API_TOKEN`, without `FIRESTORE_PROJECT`, and without `STREAM_ENC_KEY`. I chose to fail at startup rather than run quietly in a state that loses audit data or leaves patient data unencrypted.

## Accounts

For a local run with `DEMO_ACCOUNTS=true`, these accounts exist in memory, all with the password `Demo-Sirujuk-2026!`:

| Role | Email |
|---|---|
| Verifier | verifikator@demo.sirujuk.id |
| TKMKB | tkmkb@demo.sirujuk.id |
| Health office | dinkes@demo.sirujuk.id |
| Doctor | dokter@demo.sirujuk.id |

The doctor account is linked to the doctor id `d-001`, so it only sees referrals written by that doctor.

Real accounts live in Firestore and are managed from a machine that is signed in with `gcloud`:

```
cd backend-go
go run ./cmd/useradd -project <PROJECT_ID> -email a@agency.go.id -nama "Name" -role verifikator
go run ./cmd/useradd -project <PROJECT_ID> -email d@agency.go.id -nama "Name" -role dokter -doctor-id d-001
go run ./cmd/useradd -project <PROJECT_ID> -disable a@agency.go.id
go run ./cmd/useradd -project <PROJECT_ID> -demo
```

Passwords for normal accounts must be at least 12 characters. Demo accounts expire by themselves: `-demo` sets a seven day lifetime unless you pass `-expires-in` (for example `72h`, or `0` for no expiry), and an expired account can neither log in nor keep using an existing session. Any account can be given a lifetime the same way. The `-demo` command creates the four demo accounts with a random password printed once. It also accepts `-demo-password` for a password you choose. A published password on a production database is a real exposure, so delete or disable demo accounts after any demo.

## What each role can do

| Role | Reads | Writes |
|---|---|---|
| Verifier | All cases, patient shown as initials | Audit yellow and green cases, ask a doctor for clarification, edit and re-score non red cases |
| TKMKB | Everything, including the full patient name | Final decision on red cases, edit and re-score any case, archive |
| Doctor | Own referrals only, with category and reasons, no model internals or other users' audit trail | Answer clarification requests on own referrals |
| Health office | Region and facility aggregates only, no case rows | None |

Archiving is a soft delete. Scores, score history and audits stay in the record so an appeal can be answered later. Audits and clarifications are append only.

## Test results

I ran these on 2026-10-10 on macOS with Go 1.26.0 and the ML service v2 trained locally. They are not a CI report, so treat the numbers as a snapshot.

### Automated tests

All 101 test cases pass across 11 packages. The run is clean with the race detector enabled, and `go vet` and `gofmt` report nothing. Compared with my first run (65 tests in 8 packages), the new ones cover the memory fallback when Redis is down, account expiry, region lookup on the server, the HTTP wiring, the auth and CORS middleware, the ML client, the doctor feature selection, encryption of stored referrals, and one crash that a new test uncovered (see below).

| Package | Tests | Statement coverage |
|---|---|---|
| client (ML client) | 7 | 82.2% |
| domain (account expiry) | 1 | 26.7% |
| internal/client (Redis, memory fallback, queue encryption) | 11 | 90.0% |
| internal/guideline (144 diagnosis list) | 4 | 96.4% |
| internal/handler (HTTP handlers, validation, roles, redaction) | 24 | 82.6% |
| internal/middleware (token, actor check, CORS, headers) | 8 | 84.0% |
| internal/repository (store, Firestore, encryption at rest) | 11 | 69.2% |
| internal/sealbox (AES-256-GCM) | 2 | 84.2% |
| internal/seed (demo data) | 5 | 80.0% |
| internal/service (engine, batch features, scoring flow, auth) | 21 | 65.3% |
| router (route wiring and middleware order) | 7 | 100% |

The packages `cmd` and `cmd/useradd` have no tests of their own, and `domain` is mostly plain types. The startup guards in `cmd` were checked by hand, described below.

The tests cover the behaviors that are easiest to get wrong. Scoring fails open and answers 202 when the ML service is down. A repeated request with the same idempotency key returns the stored result. Input validation rejects control characters, bidirectional overrides, unknown fields and oversized bodies. A verifier cannot finalize a red case. Doctors only see and answer their own referrals. Disabled accounts and forged role headers are refused, and the service token is checked before any account lookup, so a caller without the token learns nothing about which accounts exist. An audit is not acknowledged unless it was saved, and state survives a restart. Queued referrals and Firestore documents are unreadable without the key, and a wrong or missing key is an error, not an empty list. Doctor features for a late score only use referrals issued before it, never the referral itself.

One of the new tests found a real defect: re-scoring an old referral crashed with a nil pointer when the diagnosis list had not been supplied. The code now treats a missing list as "NS unknown". It could not happen with the current `main.go`, which always supplies the list, but the code should not depend on that.

### Dependency scan

`govulncheck` finds no vulnerability in third party modules. It reports 28 findings in the Go standard library of the local toolchain (1.26.0), all fixed in Go 1.26.9. The Dockerfile builds on `golang:1.26-alpine`, so rebuilding the image picks up a patched release, but I did not check which version the currently deployed image uses. Update the local toolchain before running this scan again.

### Manual end to end checks with the real ML service

These were run by hand, not as automated tests.

1. With 200 synthetic referrals scored by the real model, the mix came out as 84% green, 10% yellow and 6% red. The seed does not set these shares. They are what the model made of six doctors with fixed behavior, one of them with a suspicious pattern. The model cut-offs at that time were 2.56 for yellow and 16.49 for red.
2. A verifier trying to finalize a red case got 403. The same verifier asking for clarification got 201 and the claim stayed held. A TKMKB decision then moved the claim to its confirmed or released state.
3. A doctor account saw only its own referrals. A health office account got no case rows and no per doctor statistics.
4. An account that was valid but sent with the wrong role header was refused with `ACCOUNT_INACTIVE`.
5. With the ML service stopped, a new referral still got a 202, and a re-score request returned 502 and left the stored score untouched.
6. The backend exited at startup in production without `STREAM_ENC_KEY`, and when `SEED_COUNT` was set in production or together with `FIRESTORE_PROJECT`.

### What I did not test

I did not run the full Docker Compose stack, because the Docker daemon was not running on my machine. I did not load test the service, so the design target of about 50 requests per second sustained is an assumption and not a measurement. Firestore persistence was tested against a fake HTTP server, not against a live database.

## Known limitations

These are the ones a reviewer should not have to discover on their own.

1. Only some scoring layers are active. The narrative layer always works. The doctor history layers need Redis and enough referrals per doctor (20 for the non specialist ratio, 30 for destination concentration). The facility availability layer (SISRUTE) is a synthetic mock outside production and empty in production, because official access is not available yet. The destination concentration term cannot fully work without facility distance data. Do not describe the system as having four active layers in production.
2. The 144 diagnosis table comes from a secondary source and needs review by a clinician before anyone relies on it. The embedded copy in the backend is checked against the ML table by a test, so the two cannot drift silently.
3. Precision and recall figures from the ML training report are measured on synthetic data. They show that the pipeline finds what was injected, not how it would perform on real referrals.
4. Because the red and yellow cut-offs are percentiles, a fixed share of referrals will always be flagged for review, whatever the real fraud rate is. The proposal does not yet discuss that reviewer workload.
5. Patient names and narratives can now be sealed before they reach Firestore, but only when `DATA_ENC_KEY` is set. In the current production deployment it is not set yet, so documents there are still protected only by Google's default encryption at rest. To turn it on, run `infra/gcp/setup.sh` once (it creates the `sirujuk-data-key` secret), uncomment the two `DATA_ENC_KEY` lines in `infra/gcp/cloudrun-go.yaml`, and deploy. Keep that key safe: documents saved with it cannot be read without it. `GET /ready` shows `data_encryption`. Names are still not pseudonymized, so a person who holds the key can read them.
6. Access control relies on one shared service token plus the user headers set by the Next.js server. The backend trusts those headers only as far as it trusts that token. Per user tokens would be the next step.
7. Redis in the current production deployment points at a local address, so Redis is off there. Since the last change the backend no longer loses those functions silently: doctor features, idempotent replays, the retry queue and the login limiter fall back to memory on each instance. That fallback is not shared between instances and is lost on a restart, so it is a safety net, not a substitute. Fixing it takes a real Redis URL (for example from Upstash) stored with `gcloud secrets versions add sirujuk-redis-url`, followed by a new revision. `GET /ready` keeps reporting `redis: down` until then.
8. The store reads from memory and writes through to Firestore. With more than one instance, each instance sees what it loaded at startup plus its own writes. Read from the database or add a change feed before scaling out.
9. Whether red should require two independent layers (`MIN_RED_LAYERS=2`) is a team decision. I recommend 2 before any claim is really held. The default is 1, which trusts the model.

## Production notes

Production runs on Cloud Run in the project's own region, with the ML service private and called with an ID token. Secrets are kept in Secret Manager: `sirujuk-api-token`, `sirujuk-redis-url`, `sirujuk-stream-key` and `sirujuk-data-key`. `infra/gcp/setup.sh` creates them, and `infra/gcp/cloudrun-go.yaml` references them. After every deploy, call `GET /ready` and confirm that `redis`, `firestore`, `kns` and `data_encryption` all say `ok`, then read the startup log for a `redis_unreachable` line.

Structured logs carry the actor, role, path, status and latency of each request, and never request bodies or narrative text. The path of a read on `/referrals/{id}` is the record of who opened a case.
