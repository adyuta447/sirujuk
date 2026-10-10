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

## Prinsip keputusan

Skor 0–100 dan kategori `green`, `yellow`, `red` dihitung ML service (ambang p80/p95 ada di model); Go menyiapkan masukannya (fitur dokter dari batch, snapshot SISRUTE), meneruskan hasilnya, dan menyimpannya beserta masukan itu untuk banding. Keputusan akhir untuk kasus berisiko tetap berada pada verifikator/TKMKB melalui proses human-in-the-loop.
