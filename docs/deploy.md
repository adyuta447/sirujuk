# Deploy: Vercel (frontend) + GCP Cloud Run (backend, ML)

Urutan pipeline (`.github/workflows/deploy.yml`, hanya di `main`): test + scan, lalu **ml-service**, lalu **backend**
(cek `/health`; `/healthz` dicegat Cloud Run), lalu **frontend** (Vercel). Backend tidak sehat berarti frontend tidak ter-deploy.

## Setup sekali jalan

1. **Redis gratis**: buat database di Upstash (region AS us-east-1), salin URL `rediss://...`.
   Memorystore sengaja tidak dipakai: minimalnya puluhan USD per bulan.
2. **GCP** (butuh project dengan billing, `gcloud auth login`, `gh auth login`):
   ```bash
   PROJECT_ID=<id> REDIS_URL='rediss://default:<pw>@<host>:6379' BILLING_ACCOUNT=<opsional> ./infra/gcp/setup.sh
   ```
   Script membuat registry, service account, secret, Workload Identity Federation, dan mengisi variabel GitHub `GCP_*`.
3. **Vercel** (project baru, jangan connect Git, Root Directory dikosongkan):
   ```bash
   cd frontend && npx vercel@63.1.0 link
   gcloud secrets versions access latest --secret sirujuk-api-token | npx vercel@63.1.0 env add API_TOKEN production --sensitive
   # login frontend: AUTH_SECRET khusus produksi (jangan pakai nilai lokal) dan AUTH_USERS (JSON hash scrypt, bukan akun demo lokal)
   openssl rand -hex 32 | tr -d '\n' | npx vercel@63.1.0 env add AUTH_SECRET production --sensitive
   node scripts/buat-pengguna.mjs email@instansi.go.id "Nama" verifikator   # satu entri per pengguna, gabung jadi array JSON
   npx vercel@63.1.0 env add AUTH_USERS production --sensitive               # tempel array JSON-nya
   gh variable set VERCEL_ORG_ID --body "$(jq -r .orgId .vercel/project.json)"
   gh variable set VERCEL_PROJECT_ID --body "$(jq -r .projectId .vercel/project.json)"
   gh secret set VERCEL_TOKEN   # token dari vercel.com/account/tokens
   ```
4. Push ke `main`. `BACKEND_URL` diisi otomatis oleh pipeline dari URL Cloud Run.

## Keamanan

- Tanpa kunci JSON: GitHub masuk ke GCP lewat OIDC, hanya repo ini (by id) dan hanya `refs/heads/main`. PR tidak punya akses cloud.
- `sirujuk-ml` privat (IAM): hanya service account backend yang boleh memanggil, backend memakai ID token.
- Backend publik tapi semua `/api` butuh bearer `API_TOKEN` (Secret Manager). Browser tidak pernah melihat token.
- Image di-deploy per digest, container non-root, action di-pin ke commit SHA, `govulncheck`/`pip-audit`/`npm audit` menggate deploy.
- Batas instance (backend 3, ML 2) mencegah tagihan membengkak saat diserang.
- Disarankan: aktifkan branch protection `main` dan required reviewers di GitHub Environment `production`.

## Biaya

Semua scale-to-zero, jadi idle = Rp0 (angka free tier GCP/Vercel/Upstash cek ulang di kalkulator, bisa berubah).
Trade-off: ML dingin butuh beberapa detik untuk start, sementara budget skoring backend 300 ms, jadi request pertama
setelah idle dijawab `ACCEPTED_ASYNC` (fail-open, by design). Untuk skoring sinkron saat demo/pilot, set variabel
GitHub `ML_MIN_INSTANCES=1` (berbayar, selalu hangat).

## Rotasi token

`openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add sirujuk-api-token --data-file=-`, update env `API_TOKEN`
di Vercel dengan nilai yang sama, lalu jalankan ulang workflow (`workflow_dispatch`).
