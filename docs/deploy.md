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
3. **Vercel.** Pilih satu cara, jangan dua-duanya:
   - **Integrasi Git Vercel (yang dipakai sekarang):** import repo di vercel.com/new, **Root Directory = `frontend`**, isi env `BACKEND_URL`, `API_TOKEN`, `AUTH_SECRET`. Vercel men-deploy setiap push ke `main` sendiri. Biarkan variabel GitHub `VERCEL_PROJECT_ID` kosong supaya job `deploy-frontend` dilewati.
   - **Lewat pipeline (backend dulu, baru frontend):** project baru, jangan connect Git, Root Directory dikosongkan, lalu:
   ```bash
   cd frontend && npx vercel@63.1.0 link
   gcloud secrets versions access latest --secret sirujuk-api-token | npx vercel@63.1.0 env add API_TOKEN production --sensitive
   # penanda tangan sesi login: khusus produksi, jangan pakai nilai lokal
   openssl rand -hex 32 | tr -d '\n' | npx vercel@63.1.0 env add AUTH_SECRET production --sensitive
   gh variable set VERCEL_ORG_ID --body "$(jq -r .orgId .vercel/project.json)"
   gh variable set VERCEL_PROJECT_ID --body "$(jq -r .projectId .vercel/project.json)"
   gh secret set VERCEL_TOKEN   # token dari vercel.com/account/tokens
   ```
4. **Akun login** disimpan di Firestore (dibuat oleh `setup.sh`), bukan di env Vercel. Tambah akun dari laptop:
   ```bash
   cd backend-go
   SANDI='minimal-12-karakter' go run ./cmd/useradd -project <id-project> -email a@instansi.go.id -nama "Nama" -role verifikator
   ```
   Peran: `verifikator`, `tkmkb`, `dinkes`, `dokter`. Ganti kata sandi dengan menjalankan perintah yang sama untuk email itu.
5. Push ke `main`. `BACKEND_URL` diisi otomatis oleh pipeline dari URL Cloud Run.

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
