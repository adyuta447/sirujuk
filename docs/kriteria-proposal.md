# Kriteria proposal vs sistem

Status per **11 Oktober 2026**. Acuannya proposal final `docs/Proposal Healthkathon.docx` (bagian 1 sampai 9, Limitasi, Referensi); draf awalnya ada di berkas sebelahnya. Dokumen ini dibaca bersama `proposal-gaps.md` (selisih desain proposal dan kode, sisi backend) dan `ml-service/MODEL_CARD.md` (sisi model).

Legenda: ✅ terpenuhi dan ada buktinya · 🟡 sebagian · ❌ belum ada · 🗓 janji untuk pilot, memang belum waktunya.

Semua angka kinerja model berasal dari **data sintetis**. Itu bukti bahwa jalur kerjanya benar, bukan kinerja di dunia nyata.

## 1. Ringkasan untuk keputusan

- **Model memenuhi ketiga target terukur proposal pada data sintetis** bila keempat lapis aktif: precision merah 77,7% (target ≥ 60%), recall 90,9% (≥ 70%), FDR merah 22,3% (≤ 40%).
- **Lingkungan cloud hanya menjalankan sebagian lapis.** Pada pemeriksaan 11 Okt 07:22 UTC, `/ready` melaporkan `redis: down` dan `data_encryption: down`; SISRUTE belum tersambung dan data jarak faskes belum ada. Hanya narasi yang bekerja (angkanya di bagian 2), jadi **kategori merah tidak bisa muncul di URL cloud**. Peragaan merah harus lewat lingkungan lokal dengan data sintetis, atau Redis harus diaktifkan lebih dulu.
- **Bagian 9 (Profil Tim) di proposal final masih berisi placeholder** (`[isi jumlah anggota]`, `[isi nama anggota 1]`, dan seterusnya). Ini hal paling mendesak dan murni pekerjaan manusia.
- **Lima janji proposal belum ada di sistem**: mode bayangan, audit acak sampel hijau, laporan enam ukuran dampak, penghapusan NIK dan telepon di semua format, dan penonaktifan akun demo di produksi (tabel tindakan di bagian 4 dokumen ini).
- **Cabang `feat/hardening-and-deploy` belum bergabung dengan `main`** (4 konflik). Klaim "lebih dari seratus tes backend" hanya benar di `main`.

## 2. Target terukur

| Ukuran | Target proposal | Semua lapis | NS + narasi (HHI, SISRUTE mati) | Hanya narasi (cache juga mati) |
|---|---|---|---|---|
| Precision kategori merah | ≥ 60% | **77,7%** ✅ | 75,8% ✅ | tidak ada merah, tak bisa dinilai ❌ |
| Recall kuning + merah | ≥ 70% | **90,9%** ✅ | 40,7% ❌ | 26,5% ❌ |
| FDR kategori merah | ≤ 40% | **22,3%** ✅ | 24,2% ✅ | tak bisa dinilai |
| Pangsa merah / kuning | 5% / 15% (p95 / p80) | 7,2% / 15,3% | 1,6% / 15,4% | **0% / 13,2%** |
| Beban pemeriksaan per 1.000 rujukan/hari | disesuaikan kapasitas | 225 | 170 | 132 |
| Waktu penilaian sinkron | < 0,3 detik | 137 ms saat ML hangat (diukur 10 Okt, belum diukur ulang) 🟡 | | |

Catatan:
- Kolom kedua dan ketiga bersumber dari `train.py` (`production_regime_no_hhi_no_sisrute` di laporan latih pada `main`) dan `MODEL_CARD.md`. Kolom "hanya narasi" saya ukur pada 11 Okt di data uji yang sama; angkanya menggantikan kalimat "kami memperkirakan lebih rendah lagi" di proposal bagian 5.
- Ambang tidak dipotong ulang untuk rezim lapis sedikit: memulihkan merah ke 5% menurunkan precision merah dari 0,76 menjadi 0,36 (lihat model card).
- Latensi masih dengan satu catatan: setelah PR #33, penyimpanan referral ke Firestore berjalan sinkron setelah skoring (`referral_handler.go`, `Store.Upsert`). Belum diukur; bila memperlambat, jalankan di goroutine.

**Kriteria keluar tahap.**
| Tahap | Kriteria | Status |
|---|---|---|
| 1 (bulan 1–2) | precision simulasi ≥ 60% | ✅ 77,7% |
| 2 (bulan 3–5) | precision merah tervalidasi audit manual ≥ 50% pada ≥ 5.000 episode | 🗓 butuh pilot |

## 3. Matriks per bagian proposal

### Bagian 1 dan 3: identitas dan solusi
| Klaim proposal | Bukti di repo | Status |
|---|---|---|
| Empat peran: verifikator, TKMKB, Dinkes, dokter | `frontend/lib/akses.ts`, `backend-go/internal/seed/demo_users.go`, peran dicek ulang tiap request (`middleware/active_actor.go`) | ✅ |
| Skor 0–100 saat rujukan terbit, disertai alasan dan angka di balik tiap alasan | `ml-service/app/ml/model.py` (`reasons`, `indicators`), tampil di detail rujukan | ✅ |
| Pasien tidak pernah ditahan, rujukan darurat tidak pernah ditahan | `handler/referral_handler.go` (`IsEmergency` langsung 202); yang ditahan adalah status klaim | ✅ |
| Merah hanya diputuskan TKMKB, dipaksa di kode | `handler/access.go` (`mayChangeRed`), `frontend/lib/auth/guard.ts` (`wajibTingkat`), ada tesnya | ✅ |
| Fail-open: lebih dari 0,3 detik atau ML mati, rujukan tetap jalan lalu dinilai lewat antrean | `scoreBudget = 300ms`; antrean Redis dengan cadangan memori per instance (`internal/client/resilient.go`, ada di `main`) | 🟡 jalurnya ada; antrean Redis belum menyala di cloud, cadangan memori hilang saat instance restart |
| Dokter baru tidak dihukum: ditarik ke nilai tengah dan diberi `INSUFFICIENT_HISTORY` | `app/ml/features.py` (`shrink`), uji smoke | ✅ |
| Teks diproses di server sendiri, tanpa layanan AI luar | TF-IDF karakter di `ml-service`, tanpa panggilan keluar | ✅ |
| Skor menyimpan versi model, ambang, masukan, alasan (untuk banding) | `RiskDecision` + `ScoreSnapshot` + `FeatureSnapshot`, disimpan di Firestore | ✅ |
| Merah baru berlaku bila ≥ 2 lapis menyala; "mekanismenya sudah ada, tinggal diaktifkan" | `MIN_RED_LAYERS` ada, **default 1** | 🟡 butuh keputusan tim (bagian 5) |
| Empat lapis aktif | Lokal dengan seed: ya. Cloud: hanya narasi (bagian 2) | 🟡 |

### Bagian 4: pendekatan teknis dan data
| Klaim proposal | Bukti | Status |
|---|---|---|
| Data sintetis dengan pola suntikan, kolusi sulit, dokter mirip tapi wajar | `ml-service/app/ml/synth.py` | ✅ |
| NS: ≥ 20 rujukan, 90 hari, median dan MAD per wilayah dan tipe faskes | `app/ml/features.py`, `model.py` | ✅ |
| HHI: ≥ 30 rujukan, 180 hari, batas 1.500 dan 2.500; hanya bila tujuan dominan dan bukan terdekat | `features.py`, `indicators()`; data jarak belum ada, alasannya ditulis (`HHI_NEAREST_UNKNOWN`) | ✅ logika · ❌ data jarak |
| Ketersediaan SISRUTE dengan bobot `1/(1+umur/30)` | `model.py` | ✅ logika · ❌ akses resmi |
| Narasi: TF-IDF karakter + cosine, panjang dibuang, 10% terendah ditandai, diagnosis tak dikenal tidak dinilai | `model.py`, `diagnosis.py` | ✅ |
| Regresi logistik; bobot sama rata PR-AUC 0,50 vs 0,82 | `train_report.json` (`baseline_equal_weights_0.25` 0,5048; `pr_auc` 0,822) | ✅ |
| Ambang bisa diubah lewat konfigurasi tanpa melatih ulang, dikirim bersama hasil | `ML_YELLOW_FROM`, `ML_RED_FROM`; `yellow_from`/`red_from` di respons | ✅ |
| Nama pasien tidak dikirim ke layanan skoring | `client/ml_client.go` (`mlRequest` tanpa nama) | ✅ |
| NIK dan nomor telepon di narasi dihapus sebelum diproses | `app/utils/preprocessing.py` | 🟡 hanya format polos, lihat P0-3 |
| Antrean Redis dienkripsi AES-256-GCM | `internal/sealbox` (di `main`; di cabang hardening berkasnya `internal/client/seal.go`), `STREAM_ENC_KEY` wajib di produksi | ✅ |
| Hak akses per peran dicek ulang di server; akses dicatat per pengguna | `ActiveActor`, `middleware/logger.go` | ✅ |
| Layanan skoring privat, hanya backend yang bisa memanggil | Cloud Run privat, token identitas Google (`ML_AUTH=cloudrun`) | ✅ |
| Dinkes hanya agregat tanpa baris kasus | `handler/stats.go`, `visibilityOf` (Dinkes tak melihat baris pasien) | ✅ |
| Pemindaian kerentanan sebelum deploy | `.github/workflows/deploy.yml`: govulncheck, pip-audit, npm audit | ✅ |

### Bagian 5: kematangan teknologi (TKT 3 menuju 4)
| Klaim proposal | Bukti | Status |
|---|---|---|
| Fitur utama jalan ujung ke ujung pada data sintetis | `docs/demo.md`, `docker compose up`, `SEED_COUNT` | ✅ lokal |
| Backend: lebih dari seratus tes | **112 tes di `main`**, 65 di `feat/hardening-and-deploy` | 🟡 benar setelah merge |
| Antarmuka: puluhan tes | 59 tes jest, 10 suite (cabang hardening) | ✅ |
| Layanan skoring punya skrip uji | `ml-service/tests_smoke.py` | ✅ |
| Pemindaian dependensi tiap perubahan | CI `main` hijau pada `c856737` | ✅ |
| Semua angka hasil model (77,7%; 90,9%; 22,3%; 91% dan 64% pada 5%; 82% pada 10%; 0,42 tanpa jarak; 0,25 setengah kekuatan; 36% kolusi; 73/72/79/82% per strata; 22,5% dan 224/hari) | Diperiksa satu per satu terhadap `train_report.json` hasil latih ulang: semua cocok | ✅ |
| Setiap baris contoh ditandai sintetis, ada banner | `Synthetic` di domain dan `/stats`, `BannerSintetis` di Dashboard, Analytics, Dinkes | ✅ |
| Jujur soal lingkungan demo cloud | Kalimat "hanya lapis narasi" sudah ada; angka recall 41% sudah ada; perkiraan "lebih rendah lagi" kini terukur: 26,5% | 🟡 ganti kalimat perkiraan dengan angka ini |

### Bagian 6: rencana dan kelayakan (prasyarat pilot)
| Prasyarat tahap 2 | Status |
|---|---|
| Enkripsi data pasien di Firestore aktif | ❌ kode ada (`DATA_ENC_KEY`), secret belum dibuat; `/ready` melaporkan `data_encryption: down` |
| Kredensial per pengguna | 🟡 akun per pengguna di Firestore ✅; token layanan antar-layanan masih satu bersama |
| Hosting di wilayah Indonesia | ❌ sekarang `us-east4` |
| Akun demo dihapus | ❌ empat akun `*@demo.sirujuk.id` ada di Firestore produksi dengan sandi publik; kedaluwarsa hanya untuk akun yang dibuat atau diperbarui dengan `useradd -set-expiry` (belum dicek apakah sudah dijalankan) |
| Mode bayangan (skor dihitung tapi tak memengaruhi keputusan) | ❌ tidak ada di kode |
| Peninjauan dokter atas daftar 144 dan teks panduan; penetapan otoritas daftar | ❌ pekerjaan manusia |
| Audit acak 0,5–1% sampel hijau (tahap 3) | ❌ tidak ada di kode |
| Akses SISRUTE, data jarak, PCare/VClaim | ❌ butuh pihak luar |

### Bagian 7: dampak dan nilai (enam ukuran pilot)
Data dasarnya tersimpan (skor, hasil audit, klarifikasi, status klaim, `/stats` per wilayah dan dokter), tetapi **belum ada laporan atau ekspor** untuk keenam ukuran. Yang sudah bisa dihitung dari data tersimpan: beban per hari, porsi NS per wilayah (🟡). Yang belum: precision merah terhadap audit manual, recall dari sampel hijau (butuh audit acak), waktu terbit sampai terdeteksi, salah tandai per kelompok (❌).

### Bagian 8: risiko dan privasi
| Klaim proposal | Status |
|---|---|
| Data sintetis saja, tidak ada data peserta riil | ✅ |
| Enkripsi nama dan narasi di basis data ada di kode tapi belum aktif; wajib aktif sebelum data nyata | ✅ jujur · ❌ belum aktif |
| Mitigasi risiko data tidak tersedia: "alasan yang menyebut lapis mana yang tidak dinilai" | 🟡 `HHI_NEAREST_UNKNOWN` dan `DIAGNOSIS_UNMAPPED` ada; `SISRUTE_UNKNOWN` baru di sisi ML, **backend masih mengirim `false`, bukan `null`**; saat cache mati semua dokter tampil `INSUFFICIENT_HISTORY` padahal sebabnya infrastruktur |
| Klarifikasi dokter sebelum sanksi; dokter hanya melihat rujukannya sendiri | ✅ |
| Pemantauan salah tandai per kelompok (perdesaan, Puskesmas) | 🟡 diukur offline di laporan latih; belum ada di produksi |
| Skor, versi model, alasan disimpan permanen | 🟡 disimpan di Firestore; arsip hanya soft delete; belum ada cadangan terjadwal |

### Bagian 9, Limitasi, Referensi
| Butir | Status |
|---|---|
| Profil tim terisi | ❌ placeholder di proposal final |
| Limitasi 1–5 konsisten dengan sistem | ✅ (lapis tidak aktif, daftar 144, kolusi, pemalsuan oleh peserta di luar cakupan) |
| Referensi [2] dan [10] (Permenkes 5/2014 dicabut oleh 4/2026) | 🟡 diperiksa 11 Okt lewat pasal.id dan ringkasan PDF peraturan.go.id; `jdih.kemkes.go.id` tidak terjangkau, jadi konfirmasi ke sumber primer |
| Referensi [6] (statistik BPJS 31 Juli 2026), [7], [9] | ❌ belum saya verifikasi; [9] adalah artikel Kompasiana yang mengutip data DJSN 2015, sumber sekunder yang disebut "jelas" di bagian 2 |

## 4. Janji proposal yang belum ada, berurutan menurut prioritas

| # | Tindakan | Pemilik | Catatan |
|---|---|---|---|
| P0-1 | Isi Bagian 9 Profil Tim di proposal final | PM | satu-satunya bagian yang masih kosong |
| P0-2 | Putuskan lingkungan peragaan merah: lokal dengan `SEED_COUNT=200` atau cloud dengan Redis aktif | PM + DevOps | tanpa cache riwayat dokter, cloud tak pernah menghasilkan merah |
| P0-3 | Samakan klaim "NIK dan telepon dihapus" dengan kode: format `3171 2345 6789 0001`, `3171-2345-6789-0001`, `0812-3456-7890`, `+62 812 3456 7890`, `6281234567890` lolos tanpa dihapus | ML | perbaikan: hapus pemisah lalu cocokkan; tambah tes. Atau ubah kalimat proposal menjadi "format polos" |
| P0-4 | Aktifkan `DATA_ENC_KEY` (jalankan `infra/gcp/setup.sh`, buka komentar di `cloudrun-go.yaml`) | DevOps | wajib sebelum satu pun data nyata |
| P0-5 | Atur kedaluwarsa atau hapus empat akun demo di Firestore produksi | DevOps | `useradd -set-expiry` |
| P1-6 | Hubungkan Redis (URL Upstash) | DevOps | menyalakan NS dan antrean async; `INSUFFICIENT_HISTORY` palsu hilang |
| P1-7 | Backend kirim `sisrute_available: null` selama SISRUTE kosong | Backend | ML dan label frontend sudah siap |
| P1-8 | Gabungkan `feat/hardening-and-deploy` dengan `main`, selesaikan 4 konflik (login limiter harus memakai `pembatas.ts` milik `main`) | Frontend + PM | juga membuat klaim 112 tes berlaku di satu cabang |
| P1-9 | Putuskan `MIN_RED_LAYERS` (usul: 2) | PM + TKMKB | proposal bagian 3 dan 8 sudah menyebutnya sebagai mitigasi |
| P1-10 | Selaraskan teks landing dengan bagian 5: "Memakai data SISRUTE Kemenkes" dan logo BPJS | Frontend | tulis "dirancang memakai", tambah catatan bukan produk resmi, pastikan izin logo |
| P2-11 | Mode bayangan | Backend | skor tersimpan, tidak mengubah status klaim atau antrean |
| P2-12 | Audit acak sampel hijau | Backend + Frontend | sampling dan antrean khusus |
| P2-13 | Laporan enam ukuran dampak | Backend | ekspor dari data yang sudah tersimpan |
| P2-14 | Peninjauan dokter atas daftar 144 dan penetapan otoritasnya | PM + dokter peninjau | |
| P2-15 | Verifikasi referensi [6], [7], [9], [10] ke sumber primer | PM | |
| P2-16 | Pindah hosting ke wilayah Indonesia | DevOps | sebelum pilot |
| P2-17 | Nama dokter dari backend, bukan `NAMA_DOKTER` di frontend | Backend + Frontend | dokter nyata kini tampil sebagai ID |

## 5. Keputusan yang dibutuhkan dari tim

1. **Lapis yang aktif saat peragaan.** Lokal dengan semua lapis sintetis, atau cloud dengan Redis (NS jalan, HHI dan SISRUTE tetap mati, recall sekitar 41%).
2. **`MIN_RED_LAYERS`.** Tetap 1 (percaya model) atau 2 seperti yang dijanjikan proposal sebagai mitigasi. Di cloud saat ini hanya dua lapis yang mungkin menyala (NS dan narasi), sehingga nilai 2 menuntut keduanya.
3. **Kalimat bagian 5 tentang lingkungan cloud.** Ganti "kami memperkirakan angkanya lebih rendah lagi" dengan angka terukur: recall 26,5% dan nol kategori merah.
4. **Pernyataan penghapusan NIK dan telepon.** Perbaiki kodenya (P0-3) atau persempit kalimatnya.

## 6. Cara memperbarui dokumen ini

- Angka model: `cd ml-service && python train.py > models/train_report.json`, lalu baca `production_regime_no_hhi_no_sisrute` dan `capacity_table`.
- Jumlah tes: `cd backend-go && go test -list '.*' ./... | grep -c '^Test'`, dan `cd frontend && npx jest --ci`.
- Kesiapan cloud: `curl https://sirujuk-backend-148917316834.us-east4.run.app/ready`.
- Bila proposal berubah, mulai dari tabel di bagian 3 sesuai nomor bagiannya, bukan dari ringkasan.
