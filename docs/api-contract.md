# API Contract

## `POST /api/v1/referrals/score`

Request:

```json
{
  "referral_id": "r-001",
  "patient_name": "A",
  "doctor_id": "d-001",
  "origin_facility_id": "fktp-001",
  "destination_facility_id": "fkrtl-001",
  "diagnosis_code": "I10",
  "reason": "Keterbatasan alat",
  "clinical_narrative": "Pasien ...",
  "issued_at": "2026-09-27T12:00:00Z",
  "is_emergency": false
}
```

Response:

```json
{
  "referral_id": "r-001",
  "score": 72.4,
  "decision": "yellow",
  "signals": {
    "nlp_similarity": 0.42,
    "anomaly_score": 0.71,
    "fraud_score": 0.68
  },
  "model_version": "<mlflow run id>",
  "reason_codes": ["NS_HIGH"],
  "requires_human_review": true,
  "status": "SCORED"
}
```

Header wajib: `Idempotency-Key` (= `referral_no`). Opsional: `X-Correlation-ID`, `Authorization: Bearer <API_TOKEN>` bila `API_TOKEN` diset.

`202 Accepted` (`status: "ACCEPTED_ASYNC"`): ML timeout (300 ms) / error, atau rujukan darurat. Rujukan tetap berjalan; dinilai belakangan lewat Redis Stream `scoring:retry`. Tidak pernah 5xx karena ML.
Error: `{code, message, correlation_id}`. `decision` wire format huruf kecil; DB menyimpan `GREEN/YELLOW/RED`.

Alur: handler -> `DecisionService` (fitur dokter dari Redis `doctor:{id}`, SISRUTE dari `FacilityRepository`, fallback `context` dari request) -> ML `/v1/predict` -> `DecisionEngine`. Kategori green/yellow/red datang dari ML (p80/p95 hasil latihnya); backend tidak punya ambang sendiri.

`decision` hanya boleh dibuat backend Go.

## Async scoring & idempotency

- Ulangi `POST /referrals/score` dengan `Idempotency-Key` yang sama -> hasil tersimpan dikembalikan (200), tidak dinilai ulang.
- Worker Go membaca Redis Stream `scoring:retry` (grup `scorers`): maks 3 percobaan dengan backoff + jitter, lalu pindah ke `scoring:dlq`. Hasil async muncul di `GET /referrals/{id}` dan daftar.
- Health check: `GET /health`.

## CRUD rujukan (semua perubahan skor lewat ML)

| Aksi | Endpoint (Go) | Peran (diperiksa di proxy Next.js) |
|------|---------------|-----------------------------------|
| Create | `POST /api/v1/referrals/score` | petugas |
| Read | `GET /api/v1/referrals`, `GET /api/v1/referrals/{id}` | petugas |
| Update | `PUT /api/v1/referrals/{id}` (diagnosis, alasan, narasi; dinilai ulang ML), `POST /api/v1/referrals/{id}/rescore` | petugas |
| Delete | `DELETE /api/v1/referrals/{id}`: arsip, bukan hapus. Skor, riwayat skor, dan audit tetap ada | TKMKB |
| Klarifikasi | `POST /api/v1/referrals/{id}/clarifications` (hanya tambah) | dokter, petugas |
| Audit | `POST /api/v1/audits` (hanya tambah) | petugas |
| Statistik | `GET /api/v1/stats` (wilayah + dokter; Dinkes hanya wilayah) | petugas, Dinkes |

Update/rescore: bila ML tidak tersedia -> 502 `SCORING_UNAVAILABLE` dan skor lama tidak berubah (tidak ada tebakan). Skor lama masuk `history`. Respons skor memuat `features` (masukan persis yang dilihat ML) untuk banding.
Audit dan klarifikasi sengaja tidak bisa diubah/dihapus (append-only).

## Identitas, peran, dan klaim

Proxy Next.js mengirim `X-Actor` (email akun) dan `X-Actor-Role` dari sesi yang ditandatangani. Backend tidak mempercayai peran dari body. Tiap request ber-`X-Actor` dicek ulang ke daftar akun (cache 30 dtk): akun dinonaktifkan, tidak ada, atau perannya berubah -> 403 `ACCOUNT_INACTIVE`; daftar akun tidak terjangkau -> 503 (fail closed).

| Aksi | Peran |
|------|-------|
| Audit (valid, tidak-valid) pada rujukan hijau/kuning | verifikator, TKMKB |
| Audit final pada rujukan **merah** | hanya TKMKB (verifikator -> 403 `FORBIDDEN_ROLE`; ia hanya boleh `perlu-klarifikasi`) |
| Arsip | TKMKB |
| Update, rescore | verifikator, TKMKB |
| Klarifikasi | dokter (hanya rujukan dengan `doctor_id` = milik akunnya), verifikator, TKMKB |
| List/detail rujukan | petugas: semua. Dokter: hanya miliknya. Dinkes: tidak ada baris pasien |
| Stats | petugas; Dinkes hanya `wilayah` (tanpa `dokter`) |

`StoredReferral` memuat `claim_status` dan `final` (diturunkan dari jejak audit, bukan input):
- `normal`: bukan merah
- `ditahan`: merah, belum ada keputusan final (hasil `perlu-klarifikasi` tidak final)
- `dilepas`: TKMKB menyatakan `valid`
- `temuan-terkonfirmasi`: TKMKB menyatakan `tidak-valid`

Merah menahan **pembayaran klaim**, bukan pasien. Audit dan klarifikasi mencatat `actor` (email) di samping nama tampilan.

`reason_category` (`clinical|equipment|staff`) opsional di request skor: bila ada, teks bebas `reason` tidak ditebak lewat kata kunci.

## Penyimpanan

Dengan `FIRESTORE_PROJECT`, rujukan, skor, audit, dan klarifikasi ditulis ke Firestore (koleksi `referrals`) **sebelum** dibalas berhasil; gagal simpan -> 503 `STORAGE_UNAVAILABLE` dan tidak ada yang berubah. Di `APP_ENV=production` backend menolak start tanpa `FIRESTORE_PROJECT`.

## Fitur dokter (lapis 2-3)

Job batch (`service.RunFeatureJob`, 6 jam sekali) menghitung NS(d) (90 hari, n>=20) dan HHI(d) (180 hari, n>=30) dan menulis `doctor:{id}` ke Redis. NS butuh daftar 144 diagnosis (`KNS_FILE`; compose memasang `ml-service/app/ml/data/kns144.tsv` agar Go dan ML membaca satu daftar yang sama, bersumber sekunder dan perlu ditinjau klinisi); tanpa file itu NS tetap kosong, tidak ditebak. `to_dominant_dest` dihitung per rujukan dari tujuan dominan dokter.

Respons skor kini meneruskan apa adanya dari ML: `indicators` (ns, hhi, sisrute, narrative), `yellow_from`/`red_from` (ambang model saat itu), `diagnosis_version`, `model_version`, `reasons`. Rujukan lama dinilai ulang dengan fitur point-in-time (hanya rujukan dokter itu sebelum `issued_at`, tanpa dirinya sendiri); rujukan baru (<10 menit) memakai cache batch. `dest_is_nearest` dan `stratum` dikirim `null` selama belum ada data jarak/wilayah, tidak diisi tebakan.

## Kesiapan dan keamanan antrean

`GET /ready` (tanpa token, hanya label) menjawab `{"redis","firestore","kns"}` = `ok|down`. Pakai ini setelah deploy untuk memastikan Redis benar-benar tersambung; bila Redis mati backend tetap menilai, tetapi fitur batch, idempotensi, antrean async, dan pembatas login mati (log `redis_unreachable`).
Rujukan dalam antrean Redis dienkripsi AES-256-GCM dengan `STREAM_ENC_KEY`; entri DLQ menyimpan isi yang sama (tetap terenkripsi) agar bisa diputar ulang. Produksi menolak start tanpa kunci.
Merah dapat ditahan bila `MIN_RED_LAYERS` lapis independen berkontribusi (default 1); kategori model tetap di `model_category`.
Seed (`SEED_COUNT`) ditolak di produksi atau dengan Firestore; baris seed bertanda `synthetic: true`, dan `/stats` membawa `synthetic`.
Redaksi per peran: TKMKB penuh; verifikator melihat nama pasien sebagai inisial; dokter hanya kategori, alasan, dan permintaan klarifikasi (tanpa fitur, riwayat skor, nama pasien, atau jejak audit orang lain). Ubah/hitung ulang rujukan merah hanya TKMKB.
