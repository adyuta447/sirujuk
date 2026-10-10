# SIRUJUK Anti Fraud

Sistem Verifikasi Rujukan Berbasis Data untuk mendeteksi rujukan berisiko pada Program Jaminan Kesehatan Nasional.

## Struktur

- `backend-go/` — API dan decision engine; satu-satunya pemilik keputusan green/yellow/red.
- `ml-service/` — FastAPI inference-only untuk anomaly, NLP similarity, dan fraud score.
- `frontend/` — Next.js 16.3.6 untuk dashboard, antrean audit, dan visualisasi.
- `infra/` — Redis, Cloud Run, Docker, dan monitoring.
- `tests/` — strategi pengujian lintas komponen.
- `system-rules/` — aturan batas tanggung jawab agar sistem tidak chaos.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Endpoint utama: `POST /api/v1/referrals/score`. Skor adalah alat bantu prioritisasi audit, bukan bukti fraud atau keputusan sanksi otomatis.

## Akun demo

Halaman login: `/login`. Akun dibuat admin, tidak ada pendaftaran sendiri. Data di dalamnya sintetis (ada banner "DATA SINTETIS").

| Peran | Email | Halaman awal | Bisa |
|-------|-------|--------------|------|
| Verifikator BPJS | verifikator@demo.sirujuk.id | /dashboard | Antrean, detail, audit kasus kuning, skor rujukan |
| Anggota TKMKB | tkmkb@demo.sirujuk.id | /audit | Semua yang di atas, plus memutuskan kasus merah dan mengarsipkan |
| Dinas Kesehatan | dinkes@demo.sirujuk.id | /dinkes | Pantauan per wilayah, tanpa data pasien |
| Dokter FKTP | dokter@demo.sirujuk.id | /klarifikasi | Hanya rujukannya sendiri (d-001) dan menjawab klarifikasi |

- **Lokal** (`DEMO_ACCOUNTS=true`, `APP_ENV=development`): kata sandi semua akun `Demo-Sirujuk-2026!` (publik, lihat `docs/demo.md`). Tombol "Coba tanpa akun" di halaman login masuk satu klik.
- **Yang di-deploy (https://sirujuk.vercel.app):** keempat akun `*@demo.sirujuk.id` **ada dan aktif** di Firestore proyek `sirujuk-35f83e` (dibuat 2026-10-10 11:29 UTC) dengan kata sandi demo publik di atas, jadi siapa pun yang tahu kata sandi itu bisa masuk ke situs produksi. Itu disengaja untuk demo; nonaktifkan atau hapus sebelum data rujukan sungguhan masuk (`cd backend-go && go run ./cmd/useradd -project sirujuk-35f83e -disable verifikator@demo.sirujuk.id`, ulangi per akun; `-enable` mengaktifkannya lagi). Tombol "Coba tanpa akun" tidak muncul di produksi (`DEMO_MODE` tidak diset), dan backend menolak `DEMO_ACCOUNTS=true` saat `APP_ENV=production`; akun di Firestore tidak terkena aturan itu karena dibuat dari CLI. Akun milik pengelola, satu per peran: `yutaagra+verifikator@gmail.com`, `yutaagra+tkmkb@gmail.com`, `yutaagra+dinkes@gmail.com`, `yutaagra+dokter@gmail.com` (kata sandi acak, tidak ada di repo). Buat atau ganti akun: `SANDI='min-12-karakter' go run ./cmd/useradd -project sirujuk-35f83e -email a@instansi.go.id -nama "Nama" -role verifikator`. Login satu email dikunci 15 menit setelah salah berulang (batas 5 percobaan di frontend per instance, 10 di backend).

## Prinsip keputusan

Skor 0–100 dan kategori `green`, `yellow`, `red` dihitung ML service (ambang p80/p95 ada di model); Go menyiapkan masukannya (fitur dokter dari batch, snapshot SISRUTE), meneruskan hasilnya, dan menyimpannya beserta masukan itu untuk banding. Keputusan akhir untuk kasus berisiko tetap berada pada verifikator/TKMKB melalui proses human-in-the-loop.
