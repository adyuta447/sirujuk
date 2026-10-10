# Proposal Gaps & Backend Fixes (review arsitek backend)

Acuan: `system-rules/backend-go-rules.md`. Status: ✅ sudah di kode, 📄 perlu masuk proposal/desain, 🔧 TODO kode.

## A. Kekurangan di proposal (perlu ditambahkan/diperbaiki)

| # | Gap | Perbaikan |
|---|-----|-----------|
| 1 | **Tidak ada arsitektur sistem.** Proposal hanya bicara model, bukan bagaimana skor tidak menghambat layanan. | Tambah bagian "Arsitektur": Go core API + Python scoring service, PostgreSQL, Redis, Pub/Sub/Redis Streams, GCP Jakarta (asia-southeast2). |
| 2 | **Merah = "menahan klaim"** ambigu; bisa dibaca menahan rujukan pasien. | Tegaskan: merah menahan **pembayaran klaim**, bukan pasien. Rujukan darurat tidak pernah ditahan, hanya dianalisis retrospektif. |
| 3 | **Tidak ada fail-open.** Skoring sinkron saat penerbitan rujukan bisa memblokir layanan jika down. | Budget 300 ms; timeout/error → rujukan lanjut, skor async lewat antrean + DLQ (✅ handler). |
| 4 | **Ambang p80/p95 tidak operasional.** Percentil dari distribusi apa, kapan dihitung ulang? | Ambang disimpan sebagai konfigurasi per versi model, dihitung batch dari distribusi historis; bukan konstanta (✅ `DecisionEngine`, nilai 50/80 masih placeholder). |
| 5 | **Reproduktibilitas banding.** Dokter bisa banding berbulan-bulan kemudian. | Simpan per skor: versi model (MLflow run ID), w1–w4, ambang, snapshot fitur (NS, HHI, Flag, w_f, NLP raw & z), timestamp snapshot SISRUTE, reason codes. Tabel `risk_scores` immutable. |
| 6 | **Human-in-the-loop hanya narasi.** | Dipaksa di kode: keputusan final hanya ditulis `case_decisions` oleh user TKMKB/verifikator terautentikasi; model tidak punya jalur tulis. |
| 7 | **Privasi hanya disebut, tanpa mekanisme.** | Pseudonimisasi NIK/no. kartu (HMAC, kunci di Secret Manager) saat ingest; narasi dienkripsi; mTLS antar layanan; **tanpa LLM eksternal untuk data pasien** (embedding self-hosted); Dinkes hanya agregat fasilitas. |
| 8 | **Audit log tidak ada.** | Append-only, INSERT-only grant, hash chain, ditulis transaksional dengan aksi. |
| 9 | **Tidak ada RBAC.** | Peran: VERIFIKATOR_CABANG, TKMKB, DINKES, FKTP_DOCTOR, ML_ENGINEER, ADMIN (least privilege, lihat rules). |
| 10 | **Alur klarifikasi dokter** disebut tanpa API/state. | `POST /v1/doctors/{id}/clarifications` sebelum sanksi apa pun. |
| 11 | **Fitur dokter (NS, HHI) tidak dibedakan online vs batch.** | NS/HHI dihitung batch malam, di-cache Redis; hanya Flag dan NLP online. Menjaga p95 < 300 ms. |
| 12 | **Cold start NS/HHI**: dokter < 20 / < 30 rujukan. | Fitur NULL → komponen dikeluarkan dari skor dan dicatat di reason code, bukan dianggap 0. |
| 13 | **Skala tidak dihitung.** | Target ~100 jt rujukan/tahun ≈ 275 rb/hari, ~50 req/s (burst 200 req/s jam 07–14 di tiga zona waktu). Tabel `referrals` dipartisi bulanan. |
| 14 | **Adapter eksternal tidak terdefinisi.** | Satu interface per sumber: `ReferralSource`, `FacilityAvailability`, `DoctorCredential`, `ClinicalGuideline`. PoC = mock data sintetis; produksi diblokir akses resmi & verifikasi endpoint SISRUTE. Wajib timeout, retry backoff+jitter (maks 3), circuit breaker, idempotency key. |
| 15 | **SLO & observabilitas tidak ada.** | p95 sync < 300 ms, backlog async < 15 menit, case API p95 < 400 ms, ketersediaan 99,5% (PoC). Metrik: rasio sync/async, fail-open count, queue depth, DLQ, staleness SISRUTE, distribusi kategori harian. |
| 16 | **Label pelatihan tak dirancang.** Target 200 kasus berlabel bergantung pada ini. | `case_decisions` (RELEASE vs CONFIRMED_ISSUE pasca-audit) = label kalibrasi regresi logistik; desain bersama ML engineer. |
| 17 | **Rumus skor ambigu.** `w3·w_f·Flag` dan Z(NS), Z(HHI) bisa NULL/negatif; sigmoid atas jumlah bobot 0,25 menghasilkan skor menggerombol sekitar 50. | Definisikan skala input sebelum sigmoid (mis. bias/intersep) agar distribusi skor tidak menumpuk; validasi di data sintetis. |
| 18 | **Klaim referensi/angka** (statistik 31 Juli 2026, dll.) ditulis pasti. | Tandai sebagai asumsi yang harus diverifikasi; data 2015 sudah dinyatakan usang, pertahankan. |

## B. Ketidaksesuaian kode saat ini terhadap rules

| Temuan | Status |
|--------|--------|
| Score endpoint tidak fail-open, error → 502 | ✅ diperbaiki: timeout 300 ms, error → 202 |
| Tidak ada `Idempotency-Key` | ✅ wajib, = `referral_no` |
| Emergency tidak di-bypass | ✅ langsung 202, tanpa hold |
| Error body tanpa `{code,message,correlation_id}` | ✅ + header `X-Correlation-ID` |
| Kategori `green/yellow/red` lowercase, ambang hard-coded 50/80 | ✅ `GREEN/YELLOW/RED`, ambang injeksi (nilai riil dari p80/p95) |
| `scoring_service.go`: `FraudScore` dihitung dua kali | ✅ dihapus; skor 0–100 dimiliki ML service, Go hanya menerapkan ambang |
| Skor final dihitung di Go | ✅ skor di ML service; kategori diterapkan Go. 🔧 penulisan `risk_scores` belum ada |
| Tidak ada Postgres/repository nyata, tabel `risk_scores`/`case_decisions`/`audit_log` | 🔧 migrasi dari sketsa DB rules |
| Antrean async | ✅ enqueue + worker (3x backoff) + DLQ `scoring:dlq`; 🔧 reclaim pesan pending (XAUTOCLAIM) dan alert DLQ belum ada |
| `middleware.Auth`/`Logger` no-op, belum ada RBAC/mTLS/audit | 🔧 |
| Endpoint `/v1/cases`, `/v1/cases/{id}/decision`, clarifications belum ada; route masih `/api/v1/...` vs kontrak `/v1/...` | 🔧 |
| Adapter eksternal belum ada | 🔧 mock sintetis dulu |

## C. Urutan kerja hackathon (sesuai rules)
1. Generator data sintetis + mock adapter → 2. schema + ingest + score fail-open end to end → 3. case queue & decision API → 4. audit log & RBAC → 5. dashboard Grafana → 6. halaman "path to production" (apa yang di-mock, apa yang butuh akses resmi, apa yang berubah di skala nasional).

## Status setelah review P0/P1 (backend)

| Temuan | Status |
|--------|--------|
| Lapis 2-3 mati (tidak ada yang menulis `doctor:*`) | job batch menghitung NS/HHI; NS memakai tabel 144 diagnosis milik ML (`kns144.tsv`, sumber sekunder, **perlu ditinjau klinisi / dicocokkan dengan Permenkes 5/2014**) |
| Lapis 1 (SISRUTE) kosong | mock sintetis dari daftar FKTP di luar produksi; di produksi kosong sampai ada akses resmi |
| Ambang tidak sinkron | ambang hanya di ML; backend memakai `category` dari ML |
| Kode ICD di-hash ke 30 diagnosis sintetis (sisi ML) | **terbuka**: butuh tabel 144 diagnosis + template PPK; milik sesi ML |
| Klarifikasi hilang | API + penyimpanan Firestore, dibatasi ke dokter pemilik |
| Audit di memori | ditulis ke Firestore sebelum dikonfirmasi |
| Verifikator = TKMKB; "ditahan" tidak ada | merah final hanya TKMKB; `claim_status` ditahan/dilepas/temuan-terkonfirmasi |
| Reviewer = nama | disimpan email (`actor`) + nama tampilan |
| Akun dokter tanpa doctor_id; tidak bisa nonaktif | `doctor_id` dan `disabled` di akun; dicek ulang tiap request |
| Alasan lewat substring | `reason_category` dari daftar tetap |
| Pantau rasio darurat per dokter | `darurat` dan `persen_darurat` di `/stats` |
| Skor sintetis bukan klaim kinerja | tetap: angka precision/recall hanya di data sintetis |
| Beban review ~22% tetap (persentil) | **belum dibahas di proposal**; tambahkan analisis kapasitas |
| Bobot di-fit pada label sintetis; `DestIsNearest` selalu true; stratum default | **terbuka**: butuh data jarak faskes dan stratum wilayah; revisi proposal atau kode |
| Baris contoh tak bisa dibedakan dari data asli | `synthetic: true` pada tiap baris seed dan di `/stats`; seed ditolak di produksi atau dengan Firestore |
| Komposisi seed 60/26/14 tak sesuai proposal | seed berbasis perilaku dokter; komposisi hasil model (±84/10/6), tidak diatur seed |
| Merah bisa karena satu lapis saja | `MIN_RED_LAYERS=2` menahan merah bila kurang dari 2 lapis independen; kategori model tetap di `model_category`. Default 1 sampai tim memutuskan |
