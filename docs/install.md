# Install and setup

This page gets Sirujuk running on your machine, then walks through the first cloud deployment. If you only want to click around, the Docker route below takes about five minutes.

Per service details live in [backend.md](backend.md) and [frontend.md](frontend.md). The security review is in [security.md](security.md), and the pipeline and release test results are in [devops.md](devops.md).

The project has three services. The Next.js frontend is what people see. The Go backend owns accounts, referrals and the final green, yellow or red decision. The Python ML service only scores. They talk in that order: browser to frontend, frontend to backend, backend to ML. The browser never talks to the backend directly.

## What you need

| Tool | Version | Used for |
|:--|:--|:--|
| Docker with Compose v2 | recent | the quick local route |
| Node.js | 22 | frontend |
| Go | 1.26 | backend |
| Python | 3.12 | ML service |
| openssl | any | generating secrets |
| gcloud and gh | recent | cloud setup only |

## Quick start with Docker

1. From the repo root, run `sh infra/local-env.sh`. It writes a `.env` with fresh random secrets and switches on the demo settings (`APP_ENV=development`, `DEMO_ACCOUNTS=true`, `SEED_COUNT=200`). It will not overwrite an existing `.env`, so delete the old one first if you want a clean start.
2. Run `docker compose up --build`. The first build trains the ML model inside the image, so give it a couple of minutes.
3. Open http://localhost:3000/login.

Only the frontend is published, on port 3000. The backend, the ML service and Redis stay on the compose network.

The demo accounts all share one password, `Demo-Sirujuk-2026!`. It is public on purpose and only meant for local use.

| Role | Email | Lands on |
|:--|:--|:--|
| Verifikator BPJS | verifikator@demo.sirujuk.id | /dashboard |
| Anggota TKMKB | tkmkb@demo.sirujuk.id | /audit |
| Dinas Kesehatan | dinkes@demo.sirujuk.id | /dinkes |
| Dokter FKTP | dokter@demo.sirujuk.id | /klarifikasi |

There is also a "try without an account" button on the login page. Safari will not store a Secure cookie on plain http://localhost, so use Chrome, or run the frontend with `npm run dev` as described below.

## Running each service without Docker

Use three terminals. Start with the ML service because the backend wants to call it.

```bash
cd ml-service
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-train.txt
mkdir -p models && python train.py > models/train_report.json
shasum -a 256 models/sirujuk.joblib | cut -d" " -f1 > models/sirujuk.joblib.sha256
uvicorn app.main:app --port 8000
```

The ML service refuses to load a model whose hash does not match the `.sha256` file. That is deliberate, because the model is a pickle and loading a tampered one would run its code.

Then the backend:

```bash
cd backend-go
APP_ENV=development API_TOKEN=$(openssl rand -hex 32) DEMO_ACCOUNTS=true SEED_COUNT=200 \
KNS_FILE=../ml-service/app/ml/data/kns144.tsv SPECIALIST_FILE=../ml-service/app/ml/data/specialist.tsv \
go run ./cmd
```

Keep the `API_TOKEN` value you used, you need it for the frontend. Without Redis the backend still starts and logs a warning. Scoring works, but batch features, replay protection and the async queue stay off.

And the frontend:

```bash
cd frontend
npm ci
cat > .env.local <<EOF
BACKEND_URL=http://localhost:8080
API_TOKEN=<the same value as the backend>
AUTH_SECRET=$(openssl rand -hex 32)
DEMO_MODE=true
EOF
npm run dev
```

## Environment variables

One rule covers most mistakes: nothing secret ever gets a `NEXT_PUBLIC_` prefix, because Next.js ships those to the browser. Generate every secret with `openssl rand -hex 32`.

### Backend (Go)

| Name | Default | What it does |
|:--|:--|:--|
| APP_ENV | development | Set to `production` to turn on the strict checks below. |
| API_TOKEN | none | Shared bearer token between the Next.js server and the backend. In production it must be at least 32 characters. |
| GO_PORT | 8080 | Port to listen on. |
| ML_SERVICE_URL | http://localhost:8000 | Where the ML service lives. |
| ML_AUTH | empty | Set to `cloudrun` to send a Google ID token, which is how the private ML service on Cloud Run accepts calls. |
| REDIS_URL | redis://localhost:6379/0 | Use `rediss://` for a TLS provider such as Upstash. |
| STREAM_ENC_KEY | none | 64 hex characters. Encrypts referrals while they sit in the Redis queue. Required in production. |
| FIRESTORE_PROJECT | empty | GCP project id. Turns on Firestore for accounts, referrals, audits and clarifications. Required in production. |
| CORS_ORIGIN | http://localhost:3000 | Only matters if a browser calls the backend directly, which the deployed setup never does. |
| ALLOW_CLIENT_CONTEXT | false | When true, trusts the doctor history sent by the client. Demo only. |
| MIN_RED_LAYERS | 1 | Hold a claim as red only when this many independent signals agree. Two is the recommended policy. |
| KNS_FILE | embedded copy | Path to the 144 diagnosis list. The binary carries its own copy, so Cloud Run works without it. |
| SPECIALIST_FILE | none | Only read by the demo seed. |
| SEED_COUNT | 0 | Fills the list with that many synthetic referrals. Refused in production and when Firestore is on. |
| DEMO_ACCOUNTS | false | Creates four demo accounts with the public password. Refused in production. |
| DUMMY_SCORING | false | Replaces ML scores with a simple heuristic. Refused in production. |
| AUTH_USERS | empty | A JSON list of accounts for local runs without Firestore. |

In production the backend exits at startup if `API_TOKEN`, `FIRESTORE_PROJECT` or `STREAM_ENC_KEY` is missing, or if any of the three demo switches is on. Failing loudly beats running half configured.

### ML service (Python)

| Name | Default | What it does |
|:--|:--|:--|
| MODEL_PATH | models/sirujuk.joblib | Where the trained model sits. |
| MODEL_SHA256 | the .sha256 file | Optional. Pin the expected hash from outside the image. |
| ML_YELLOW_FROM and ML_RED_FROM | from the model | Override the cut offs. Set both or neither. |

### Frontend (Next.js)

| Name | What it does |
|:--|:--|
| BACKEND_URL | Server side only. The backend address. |
| API_TOKEN | Server side only. Must equal the backend value. |
| AUTH_SECRET | At least 32 random characters. Signs the session cookie. Without it nobody can log in. |
| DEMO_MODE | `true` shows the passwordless demo login. It is ignored on Vercel production and whenever `APP_ENV` is production. |

On Vercel, add these under Project Settings, Environment Variables, for the Production environment, and mark `API_TOKEN` and `AUTH_SECRET` as sensitive. `BACKEND_URL` is not secret.

### GitHub Actions

Repository variables, all written by `infra/gcp/setup.sh`: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`.

Optional variables: `ML_MIN_INSTANCES` (default 0, set it to 1 to keep the ML service warm, which costs money) and `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID` plus the secret `VERCEL_TOKEN`. Those three only matter if you want the pipeline to deploy the frontend itself. If Vercel's own Git integration deploys it, leave `VERCEL_PROJECT_ID` empty and that job is skipped.

### Secrets in Google Secret Manager

`sirujuk-api-token`, `sirujuk-stream-key` and `sirujuk-redis-url`. The setup script creates them, and the backend service account is the only one allowed to read them.

## First cloud deployment

You do this once. After that, merging to `main` deploys everything.

1. Create a GCP project, attach billing, then run `gcloud auth login` and `gh auth login`.
2. Create a Redis database with TLS. Upstash has a free tier. Copy the `rediss://` URL. This is optional on day one, but without it the shared login limiter and the async queue are off.
3. Run the setup script from the repo root:

```bash
PROJECT_ID=<your project id> REDIS_URL='rediss://default:<password>@<host>:6379' \
BILLING_ACCOUNT=<optional, adds a budget alert> ./infra/gcp/setup.sh
```

It enables the APIs, creates the image registry (it keeps only the two newest images), three service accounts, the Firestore database, the three secrets, two placeholder Cloud Run services, and a Workload Identity Federation setup so GitHub can deploy without a key file. That trust is limited to this repository and its `main` branch. The default region is `us-east4`. The Firestore location cannot be changed after creation, so pick the region you want before you run it.

4. Connect Vercel. Import the repository, set Root Directory to `frontend`, and add the frontend variables from above.
5. Create the first login accounts from your laptop:

```bash
cd backend-go
SANDI='at least 12 characters' go run ./cmd/useradd -project <project id> \
  -email someone@agency.go.id -nama "Full Name" -role verifikator
```

Roles are `verifikator`, `tkmkb`, `dinkes` and `dokter`. A `dokter` account also needs `-doctor-id`, otherwise it sees no referrals. Run the same command again to change a password. Use `-disable` and `-enable` to turn an account off and on.

6. Merge to `main`. The pipeline tests, scans, builds both images, deploys the ML service first and the backend second, and checks `/health` before it finishes. Vercel deploys the frontend on its own.

## Check that it works

```bash
curl https://<backend url>/health     # prints ok
curl https://<backend url>/ready      # {"firestore":"ok","kns":"ok","redis":"ok"}
```

Then log in on the site, open the scoring page and send one referral. A result with a decision and a model version means the whole chain is connected. `/ready` reports `redis` as `down` until you give the backend a real Redis URL, and that is not fatal.

## When something goes wrong

| What you see | Usual cause |
|:--|:--|
| Backend exits with "STREAM_ENC_KEY is required in production" | The Cloud Run manifest points at a secret that does not exist yet. Run `setup.sh` again, it only creates what is missing. |
| The first score after a quiet period says ACCEPTED_ASYNC | The ML service was scaled to zero and needed a few seconds to wake up. Send it again, or set `ML_MIN_INSTANCES=1`. |
| Login says the service is unavailable | The frontend cannot reach `/api/v1/auth/verify`. Check `/ready` and the backend logs. |
| Login works locally but not on Safari | Secure cookies on plain http. Use Chrome or `npm run dev`. |
| `gcloud run deploy --set-secrets` removed your other secrets | That flag replaces the whole list. Use `--update-secrets` to add one. |
| Images vanish for logged out visitors | A file extension missing from the proxy matcher in `frontend/proxy.ts`. |
