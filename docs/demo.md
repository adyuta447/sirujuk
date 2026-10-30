# Demo

Hanya untuk lokal/demo. Kata sandi di bawah ini publik, jadi akun ini ditolak backend bila `APP_ENV=production`.

## Menjalankan

Cara tercepat: `sh infra/local-env.sh && docker compose up --build` (membuat `.env` dengan nilai acak baru, lalu buka http://localhost:3000/login). Detail di bawah bila ingin mengisi sendiri.

`.env` (salin dari `.env.example`, isi rahasia dengan `openssl rand -hex 32`):

```
APP_ENV=development
DEMO_ACCOUNTS=true
SEED_COUNT=200
ALLOW_CLIENT_CONTEXT=true
```

`docker compose up --build`, buka http://localhost:3000/login.
(Chrome menerima cookie Secure di localhost; Safari tidak, pakai `npm run dev` bila perlu.)

## Akun

Kata sandi semua akun: `Demo-Sirujuk-2026!`

| Peran | Email | Halaman awal |
|-------|-------|--------------|
| Verifikator BPJS | verifikator@demo.sirujuk.id | /dashboard |
| Anggota TKMKB | tkmkb@demo.sirujuk.id | /audit |
| Dinas Kesehatan | dinkes@demo.sirujuk.id | /dinkes |
| Dokter FKTP | dokter@demo.sirujuk.id | /klarifikasi |

Alur: login -> cookie sesi (ditandatangani `AUTH_SECRET`) -> Next.js proxy menambah `API_TOKEN` -> Go `/api/v1/*` -> ML `/v1/predict`.

## Akun demo di database (Firestore)

Login frontend membaca akun dari backend (`/api/v1/auth/verify`), dan backend membaca koleksi `users` di Firestore bila `FIRESTORE_PROJECT` diisi (Cloud Run). Buat akun dari mesin Anda (butuh `gcloud auth login`):

```
cd backend-go && go run ./cmd/useradd -project <PROJECT_ID> -demo
```

Perintah itu menulis 4 akun (satu per peran, email `*@demo.sirujuk.id`) dengan kata sandi **acak** yang dicetak sekali dan tidak disimpan. Jalankan ulang untuk mengganti sandi. Hapus akun demo dari konsol Firestore setelah demo selesai.
Di Docker lokal tidak ada kredensial GCP, jadi pakai `DEMO_ACCOUNTS=true` (sandi publik di atas) untuk lokal.

## Akun: kelola dari CLI

```
go run ./cmd/useradd -project <ID> -email a@instansi.go.id -nama "Nama" -role dokter -doctor-id d-001
go run ./cmd/useradd -project <ID> -disable a@instansi.go.id    # berlaku <= 30 dtk, juga untuk sesi yang masih hidup
go run ./cmd/useradd -project <ID> -enable  a@instansi.go.id
```

Akun `dokter` wajib punya `-doctor-id`; tanpa itu ia tidak melihat rujukan apa pun. Hapus akun `*@demo.sirujuk.id` dari konsol Firestore sebelum produksi nyata. Di frontend, pastikan `DEMO_MODE` tidak diset di Vercel production.

## Data contoh (sintetis)

`SEED_COUNT=200` mengisi memori dengan rujukan **sintetis**, tiap baris bertanda `synthetic: true` dan `/stats` membawa `synthetic: true` supaya UI bisa memberi label. Enam dokter dengan perilaku tetap: d-001 pola mencurigakan (semua ke satu RS, narasi umum), d-002 borderline, d-003 sampai d-006 biasa. Riwayat dokter (NS/HHI) adalah pengganti sintetis untuk job batch; skor, kategori, dan alasan tiap baris tetap dari ML. Komposisi hijau/kuning/merah **tidak diatur seed**: itu hasil model (contoh: 84/10/6).

Seed ditolak (backend tidak mau start) bila `APP_ENV=production` atau `FIRESTORE_PROJECT` terisi, supaya pasien fiktif tidak masuk database asli. Untuk demo di URL publik pakai lingkungan terpisah (Cloud Run + database Firestore tersendiri), bukan yang produksi.

## Data sampel BPJS Kesehatan 2025 (nyata, de-identifikasi)

Folder `2025/` (Data Sampel BPJS Edisi 2025, kunjungan 2024) **tidak boleh di-commit**: repo ini publik dan data
terikat perjanjian penggunaan data BPJS (`2025/` dan `ml-service/data/bpjs/` ada di `.gitignore`).

```
cd ml-service && pip install -r requirements.txt -r requirements-train.txt
python bpjs.py "../2025/Data Sampel Reguler Edisi 2025"   # uji data + models/bpjs_peer.json + data/bpjs/seed.json
python train.py --peer models/bpjs_peer.json > models/train_report.json
```

Lalu backend dengan `SEED_BPJS_FILE=../ml-service/data/bpjs/seed.json` (Docker: `SEED_BPJS_FILE=/data/bpjs/seed.json`).
Isinya 1000 rujukan terbaru DKI Jakarta (`--province`, `--seed-rows`), riwayat NS/HHI faskes dihitung point-in-time dari
seluruh data 2024. Tiap baris bertanda `source: "bpjs-sampel-2025"` dan UI menampilkan banner "DATA SAMPEL BPJS".
Data ini tidak punya ID dokter (faskes FKTP dipakai sebagai perujuk), narasi klinis, SISRUTE, maupun jarak; jadi hanya
lapisan NS yang bisa menyala. Penjagaan sama seperti `SEED_COUNT`: ditolak di produksi dan bila `FIRESTORE_PROJECT` terisi.

Jalankan lokal tanpa Docker:
```
KNS_FILE=ml-service/app/ml/data/kns144.tsv SPECIALIST_FILE=ml-service/app/ml/data/specialist.tsv \
SEED_COUNT=200 DEMO_ACCOUNTS=true API_TOKEN=devtoken go run ./cmd   # dari backend-go
```
