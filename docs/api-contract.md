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

`GET /ready` also reports `data_encryption` (`ok` when `DATA_ENC_KEY` is set and referral documents are sealed in Firestore). Documents written before the key existed still load; an encrypted document with a missing or wrong key fails loudly instead of looking like missing data.

## Penjelasan skor, ambang, simulasi, tujuan rujukan, dan pencegahan (masukan mentoring)

Semua bagian ini membaca keluaran model; tidak ada bobot yang diubah di backend. Model dilatih pada data sintetis, dan setiap respons yang relevan menyebutnya.

**Penjelasan skor.** Setiap `decision` (verifikator dan TKMKB) membawa `breakdown`: `layers[]` (`layer`, `label`, `code`, `contribution`, `share` dalam persen), `dominant`, `summary` (kalimat mengapa hijau, kuning, atau merah), dan `basis`. `contribution` adalah koefisien x nilai suku dari regresi logistik, persis seperti yang dilaporkan model, dan hanya yang positif dihitung. Ada empat lapisan: NS, HHI, SISRUTE, narasi (NLP); P10 adalah suku di dalam lapisan narasi, bukan lapisan sendiri. Dokter tidak menerima `breakdown`. Baris lama dihitung dari `reasons` tersimpan saat dibaca.

**Urutan dan filter daftar.** `GET /referrals?limit=N` (lihat bagian paginasi): klaim ditahan dulu, lalu merah, kuning, hijau, lalu skor turun, lalu id. Indikator dominan tiap baris ada di `decision.breakdown.dominant`.

**Ambang risiko nasional.** `GET /api/v1/config/risk` (verifikator, TKMKB, Dinkes) memberi `yellow_from`, `red_from`, `actions` (rekomendasi dan `alert` per kategori), `version`, `source` (`configured` atau `model_default`), dan `model_reference` (50 dan 80, batas yang dipakai model). `PUT /api/v1/config/risk` hanya TKMKB; body `{yellow_from, red_from, actions?, version}`: `version` adalah versi yang sedang diedit (0 bila belum pernah dikonfigurasi), dan versi yang usang dijawab 409 `CONFIG_STALE`. Aturan: `1 <= yellow_from`, `red_from <= 100`, selisih minimal 5; angka atau teks di luar itu 400. `?dry_run=true` tidak menyimpan apa pun dan menjawab `impact` (jumlah rujukan tersimpan per kategori sekarang dan sesudah, dan berapa yang berpindah). Ambang berlaku untuk skor baru dan hitung ulang; setiap keputusan menyimpan ambang yang dipakainya (`yellow_from`, `red_from`), dan klaim yang sudah ditahan tetap ditahan. Instans lain mengikuti dalam maksimal 30 detik. `alert` hanya penanda: belum ada pengiriman notifikasi.

**Tujuan rujukan.** `GET /api/v1/hospitals?kind=&wilayah=` (verifikator, TKMKB, Dinkes) dan `GET /api/v1/referrals/{id}/destination-fit?distance_km=` (verifikator, TKMKB). Hasilnya `fit.verdict` (`sesuai`, `sebagian`, `tidak_sesuai`, `belum_terverifikasi`) dengan `checks[]` dan `affects_score: false`. Aturannya transparan: RS khusus hanya cocok dengan spesialisasinya (RS Khusus Jantung = Kardiovaskular), RS umum dan ketersediaan spesialis atau alat tetap `belum_terverifikasi` sampai SISRUTE tersambung, dan diagnosis di luar tabel spesialis (34 entri) tidak dinilai. Jarak hanya ditampilkan dan tidak pernah menentukan hasil. Penilaian ini tidak mengubah skor, karena model tidak dilatih dengan kompetensi RS. Direktori adalah data demo (`source: direktori-demo`, 9 RS dari `testdata/FKTL.json`) di luar produksi; di produksi kosong.

**Simulasi what-if.** `POST /api/v1/simulate` (verifikator, TKMKB): `{base_referral_id?, inputs?, destination?}`. `inputs` hanya berisi masukan yang benar-benar dipakai model (diagnosis, kategori alasan, narasi, n90, ns90, n180, hhi180, to_dominant_dest, dest_is_nearest, sisrute_available, sisrute_age_days). Dengan `base_referral_id`, masukan awal adalah fitur yang dilihat model saat rujukan itu dinilai. Hasil: `model` (skor, kategori, `breakdown`, `reasons`), `baseline` dan `delta_score` bila ada rujukan dasar, `applied_inputs` (nama saja), dan `destination_fit`. `destination` (`facility_id`, `distance_km`, `competency`, `equipment_available`) hanya masuk ke penilaian tujuan, bukan ke model, dan respons menjelaskan hal itu (`not_in_model`). Tidak ada yang disimpan dan tidak ada nama pasien atau narasi di respons. ML tidak tersedia atau mode dummy -> 502 atau 503, tidak pernah skor tebakan.

**Pencegahan dan efisiensi biaya.** `GET /api/v1/stats` membawa `prevention`: `kns_total` (diagnosis yang harus diselesaikan FKTP), `kns_flagged` (kuning atau merah di antaranya: kandidat), `kns_confirmed_invalid` (diputuskan tidak-valid oleh audit manusia: satu-satunya yang terbukti), `by_fktp` dan `by_fkrtl` (10 teratas). `prevention.cost` selalu berjenis `estimasi`. Tanpa asumsi dari pemilik (`ASSUMED_COST_PER_PREVENTED_REFERRAL_IDR` dan `ASSUMED_PREVENTION_PERCENT`) tidak ada angka rupiah sama sekali; dengan asumsi, `assumptions[]` menuliskannya dan `disclaimer` menyatakan ini bukan penghematan aktual.

## Log aktivitas pengguna

Setiap aksi pengguna yang tercatat di sini sudah dicatat backend sendiri; frontend hanya **membaca**. Yang dicatat: login dan logout, buat/lihat/daftar/ubah/hitung ulang/arsipkan rujukan, klarifikasi, audit, simulasi, dan lihat/ubah konfigurasi risiko. Penolakan (peran tidak boleh, rujukan tidak ada, validasi gagal) ikut tercatat dengan `outcome` yang sesuai. Tidak dicatat: pemeriksaan sesi, label, statistik, daftar RS, dan pembacaan log itu sendiri.

`GET /api/v1/activity` (semua peran; header `X-Actor` wajib). TKMKB membaca entri semua orang; peran lain hanya entri akunnya sendiri (parameter `actor` diabaikan). Terbaru dulu.

| Query | Arti |
|---|---|
| `limit` | 1-200, default 50 |
| `cursor` | nilai `next` dari halaman sebelumnya |
| `actor` | email (hanya berlaku untuk TKMKB) |
| `resource` | `referral` `clarification` `audit` `simulation` `config` `session` |
| `action` | `create` `read` `list` `update` `delete` `rescore` `simulate` `login` `logout` |
| `outcome` | `ok` (2xx) · `denied` (401/403/429) · `rejected` (4xx lain) · `failed` (5xx) |
| `referral_id` | semua aksi pada satu rujukan |

```json
{ "items": [ {
    "id": "9f2c...", "at": "2026-11-16T13:07:02.538Z",
    "actor": "tkmkb@x.id", "role": "tkmkb",
    "action": "update", "resource": "referral", "resource_id": "r-1",
    "outcome": "ok", "status": 200,
    "detail": ["referral_updated", "clinical_narrative", "reason"],
    "correlation_id": "" } ],
  "next": "2026-11-16T13:07:02.538Z|9f2c..." }
```

`next` kosong di halaman terakhir. `actor` kosong = tidak ada yang masuk (login gagal; email yang diketik sengaja tidak disimpan). `detail` hanya nama kolom atau kata hasil, **tidak pernah** teks pasien. Tampilkan semua teks entri sebagai teks biasa (bukan HTML). 503 `ACTIVITY_UNAVAILABLE` bila penyimpanan log tidak tersedia.

Batas yang perlu diketahui: pembacaan melihat 1000 entri terbaru (filter bekerja di dalam jendela itu); semua entri tetap tersimpan. Entri juga dicetak sebagai baris log `{"event":"activity",...}` di log platform, sehingga tetap ada bila Firestore sedang gangguan.

