# SiRujuk: Project Final Healthkathon BPJS Kesehatan 2026

Sistem verifikasi rujukan berbasis data untuk mendeteksi rujukan FKTP yang berisiko tidak diperlukan, dengan keputusan akhir tetap di tangan verifikator dan TKMKB.

- Aplikasi: https://sirujuk.vercel.app (akun demo empat peran: lihat [demo.md](demo.md))
- Angka di dokumen ini diukur pada 16–17 November 2026 di situs tersebut dan di stack lokal dengan kode yang sama. Seluruh data adalah data sintetis; tidak ada data peserta JKN riil.

Susunan dokumen mengikuti isi video final pada Panduan 20 Besar:

| Bagian | Durasi di video |
|---|---|
| [1. Perkenalan tim](#1-perkenalan-tim) | 1 menit |
| [2. Perubahan setelah coaching](#2-perubahan-setelah-coaching) | 2 menit |
| [3. Ringkasan solusi dan alur](#3-ringkasan-solusi-dan-alur) | 1 menit |
| [4. Demo aplikasi versi terbaru](#4-demo-aplikasi-versi-terbaru) | 3,5 menit |
| [5. Dampak dan bukti terukur](#5-dampak-dan-bukti-terukur) | 1,5 menit |
| [6. Bisnis model dan rencana](#6-bisnis-model-dan-rencana) | 1 menit |

---

## 1. Perkenalan tim

<!-- Diisi tim. -->

---

## 2. Perubahan setelah coaching

Mentor menilai tampilan sudah baik, sehingga perubahan difokuskan pada tiga hal: **transparansi AI, pengendalian rujukan, dan simulasi pengambilan keputusan**. Tujuh fitur yang diminta sudah dibangun dan berjalan di aplikasi. Tiap baris di bawah memuat masukan, tindakan, dan bukti angka sebelum dan sesudah.

### 2.1 Tujuh fitur dari mentor

| # | Prioritas | Masukan mentor | Tindakan | Hasil dan bukti |
|---|---|---|---|---|
| 1 | P1 | **Risk Score Breakdown & Explainability**: kontribusi NS, HHI, SISRUTE, NLP, dan P10; persentase; faktor dominan; alasan merah/kuning | Panel kontribusi di detail rujukan. Kontribusi dihitung dari koefisien × nilai suku model regresi logistik, bukan bobot yang dipilih manual | Sebelum: hanya kode alasan, tanpa persentase. Sesudah, contoh rujukan r-030 (skor 96,8): SISRUTE **71,4%**, kesesuaian narasi (NLP/P10) **28,6%**, faktor dominan SISRUTE, beserta kalimat "Merah: skor 97 mencapai batas merah 80" |
| 2 | P1 | **Risk-Based Sorting & Prioritization**: urut skor tertinggi, prioritas merah lalu kuning, indikator dominan per kasus | Urutan ditentukan server: klaim ditahan, lalu merah, kuning, dan skor tertinggi; paginasi di server; faktor dominan (dengan persen) tampil di kartu antrean | Sebelum: daftar 200 rujukan dikirim sekaligus (±519 KB), tanpa urutan dari server. Sesudah: 8 teratas di situs = 4 merah ditahan (96,8; 96,8; 96,5; 96,5), lalu kuning (66,3 ke 50,1). Uji 500 rujukan: 13 halaman × 40 baris, tanpa duplikat, sama persis dengan daftar penuh |
| 3 | P1 | **Dynamic Threshold Configuration**: hijau 0–49, kuning 50–79, merah 80–100; nasional; alert dan rekomendasi | Halaman Pengaturan Risiko: batas kuning/merah, rekomendasi dan alert per kategori, pratinjau dampak sebelum menyimpan, riwayat versi dan pengubah | Sebelum: ambang tersembunyi di model (kuning 2,56; merah 16,49), sehingga skor 20 tampil "risiko tinggi". Sesudah: skala **0–49 / 50–79 / 80–100** sesuai mentor; alert aktif untuk kuning dan merah. Hanya TKMKB yang bisa menyimpan (3 peran lain ditolak 403); 5 jenis nilai salah ditolak; perubahan bersamaan ditolak (409) |
| 4 | P1 | **Hospital Competency Assessment**: kesesuaian diagnosis dengan kompetensi RS, spesialis, alat; jarak sebagai faktor sekunder | Panel "Kesesuaian RS tujuan" di detail rujukan: memeriksa kompetensi RS terhadap diagnosis, ketersediaan spesialis dan alat, lalu jarak | Setiap rujukan punya penilaian tujuan dengan rincian pemeriksaan. Penilaian ini ditandai tidak mengubah skor risiko (`affects_score: false`), sehingga jarak tidak bisa menaikkan atau menurunkan skor |
| 5 | P2 | **Hospital Classification**: RS umum, RS khusus, penyesuaian evaluasi per kompetensi | Direktori RS dengan tipe dan spesialisasi; RS khusus dinilai berdasarkan spesialisasinya | 9 RS di direktori demo: **4 umum, 3 khusus, 2 klinik utama** |
| 6 | P2 | **What-If Simulation**: slider jarak, kompetensi, alat dan tenaga, indikator rujukan; hasil hijau/kuning/merah | Simulation Center memakai model yang sama dengan skor asli. Tidak menyimpan apa pun | Rujukan r-030 (skor 96,8): jarak 200 km, kompetensi tidak sesuai, alat tidak ada → skor **tetap 96,8**, dengan keterangan bahwa faktor itu tidak dipakai model. NS diturunkan ke 0,05 → **96,2** (−0,6). Skor asli rujukan tidak berubah setelah simulasi |
| 7 | P2 | **Referral Prevention & Cost Efficiency Analytics**: rujukan yang bisa dicegah, kasus yang bisa ditangani FKTP, estimasi efisiensi, statistik per FKTP/FKRTL | Blok pencegahan di Analytics: rujukan dengan diagnosis non-spesialistik (KNS 144, Permenkes 5/2014), yang ditandai model, dan rinciannya per FKTP/FKRTL | Dari 30 rujukan di situs: **8 (26,7%)** berdiagnosis yang seharusnya selesai di FKTP, **6** di antaranya ditandai kuning/merah. Puskesmas Kecamatan Gambir: **4 dari 4 (100%)** ditandai, semuanya merah. Estimasi potensi efisiensi: 6 kandidat × 50% = **3 rujukan × Rp373.000 = Rp1.119.000** (lihat [asumsi biaya](#asumsi-estimasi-biaya)) |

### 2.2 Tiga hal penting dari mentor

| Pesan mentor | Tindakan | Bukti |
|---|---|---|
| Jangan hanya menampilkan skor; tampilkan alasannya | Setiap skor merah/kuning disertai kontribusi per faktor dan kalimat penjelasan kategori | Contoh r-030 di baris 1 di atas |
| Jangan menjadikan jarak sebagai indikator utama | Jarak tidak menjadi masukan model; hanya dipakai pada penilaian RS tujuan sebagai faktor sekunder | Simulasi jarak 200 km: perubahan skor **0** |
| Jangan mengklaim penghematan biaya sebagai angka aktual | Estimasi biaya hanya muncul bila asumsinya ditetapkan, selalu berlabel estimasi, dan asumsinya ditampilkan | Angka di Analytics (Rp1.119.000) tampil bersama tiga asumsinya dan keterangan "Estimasi potensi efisiensi, bukan penghematan aktual: belum ada data biaya klaim riil" |

#### Asumsi estimasi biaya

| Asumsi | Nilai | Sumber |
|---|---|---|
| Biaya per rujukan yang tercegah | Rp373.000 | Rata-rata biaya rawat jalan tingkat lanjut (RJTL): pembayaran manfaat RJTL Rp48,9 triliun ÷ 131,07 juta kunjungan, Januari–November 2024 ([DJSN, Monthly Report Monitoring JKN 30 November 2024](https://kesehatan.djsn.go.id/kesehatan/doc/laporan-bulanan/Monthly_Report_JKN_11_2024.pdf)) |
| Bagian kandidat yang benar-benar tercegah | 50% | Asumsi tim; belum ada sumber resmi. Akan diganti dengan hasil audit TKMKB nyata |

Rata-rata RJTL mencakup semua kunjungan rawat jalan lanjutan, termasuk layanan mahal seperti dialisis, sehingga untuk kasus non-spesialistik angka ini kemungkinan lebih tinggi dari biaya sebenarnya.

Catatan teknis mentor (kontribusi indikator harus konsisten dengan model, bobot tidak diubah manual di dashboard): bobot model tidak bisa diubah dari aplikasi. Pengaturan risiko hanya menggeser batas kategori, dan setiap perubahan tercatat. Kontribusi dihitung dari koefisien model itu sendiri.

### 2.3 Masukan yang belum dikerjakan, dan alasannya

| Masukan | Status | Alasan |
|---|---|---|
| Validasi model dengan data audit riil, evaluasi ulang bobot (Tahap 3) | Belum | Belum ada label audit riil. Jalurnya sudah siap: label dari jejak audit TKMKB dapat diekspor (`/api/v1/labels`) dan dilatih ulang (`retrain.py`) |
| Ketersediaan spesialis dan alat secara nyata | Sebagian | Data SISRUTE belum tersambung, sehingga pemeriksaan ini tampil "belum terverifikasi", bukan ditebak |
| Ambang atau aturan khusus per tipe RS | Sebagian, disengaja | Aturan kesesuaian per tipe RS sudah berjalan: RS khusus dan klinik utama dinilai dari spesialisasinya (diagnosis di luar spesialisasi dinyatakan tidak sesuai), RS umum dari ketersediaan spesialis. Ambang skor risiko per tipe sengaja tidak dibuat agar penilaian risiko tetap berasal dari satu model yang sama, sesuai catatan teknis mentor |
| Simulasi kualitas narasi (indikator NLP) | Dibangun, belum aktif di situs | Pilihan narasi generik/spesifik sudah dibuat dan lolos uji dengan model asli (pada 13 rujukan berdiagnosis KNS, narasi spesifik selalu menurunkan skor, misalnya 58 menjadi 16,5). Kodenya sudah digabung ke main (PR #50 dan #52), tetapi backend di situs belum di-deploy ulang. Teks klinis bebas tetap tidak dikirim dari simulator |

---

## 3. Ringkasan solusi dan alur

```text
FKTP mengirim rujukan
   → Backend memvalidasi dan menyiapkan fitur (riwayat dokter: NS, HHI; SISRUTE; narasi)
   → Model ML memberi skor 0–100, kategori, dan kontribusi tiap faktor
   → Antrean prioritas: klaim ditahan → merah → kuning → hijau
   → Verifikator meninjau kuning; TKMKB memutus merah (bisa minta klarifikasi dokter)
   → Keputusan final dikunci; setiap tindakan tercatat di log aktivitas
```

Skor adalah alat bantu prioritas audit, bukan bukti kecurangan. Rujukan merah menahan pembayaran klaim sampai TKMKB memutuskan; pasien tidak tertahan.

---

## 4. Demo aplikasi versi terbaru

Buka https://sirujuk.vercel.app dan masuk dengan akun demo ([demo.md](demo.md)).

| Peran | Yang ditunjukkan |
|---|---|
| TKMKB | Antrean prioritas, detail rujukan dengan **breakdown skor** dan **kesesuaian RS tujuan**, **Pengaturan Risiko**, **Simulation Center**, **Rumah Sakit**, **Analytics** (pencegahan), **Log Aktivitas** |
| Verifikator | Antrean dan detail (nama pasien disamarkan), audit kasus kuning, minta klarifikasi pada kasus merah |
| Dokter FKTP | Hanya rujukannya sendiri, menjawab klarifikasi; tidak melihat skor maupun nama pasien |
| Dinas Kesehatan | Pantauan per wilayah tanpa data pasien |

---

## 5. Dampak dan bukti terukur

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Skor di situs yang berasal dari model ML | 0 dari 30 (16 Nov pagi: semua skor cadangan, ML tidak terjangkau di Azure) | **30 dari 30** |
| Estimasi potensi efisiensi biaya | Tidak ada | **Rp1.119.000** untuk 30 rujukan contoh, berlabel estimasi dengan asumsi bersumber |
| Upaya akses yang ditolak | Tidak tercatat | **Tercatat** di log aktivitas (siapa, apa, kapan), tanpa data pasien |
| Rujukan merah pada data contoh | 18,5% dari 200 rujukan (dokter "normal" ikut merah) | **7,4%** dari 500 rujukan (hanya dokter berpola mencurigakan dan yang borderline) |
| Skor rujukan hipertensi biasa dari dokter normal (d-003) | merah 81–90 | **hijau 27,3** |
| Waktu menilai satu rujukan baru di situs | (tidak dinilai, masuk antrean) | **0,78 detik** end to end |
| Keputusan final TKMKB dapat ditimpa | Bisa | **Tidak** (ditolak, kode 409) |
| Klaim merah yang skornya diturunkan lewat edit | Langsung dilepas tanpa audit | **Tetap ditahan** setelah 28 kali edit/hitung ulang, sampai TKMKB memutuskan |
| Layanan ML di Azure | Tidak terjangkau backend | **Terjangkau backend dengan token; panggilan tanpa token ditolak (401)** |
| Tes otomatis | — | Backend **222** fungsi tes (12 paket); frontend **185** tes (26 suite); smoke test ML lolos |

Keamanan dan privasi yang diuji: verifikator hanya melihat inisial pasien di semua halaman, dokter hanya melihat rujukannya sendiri, pencarian tidak bisa menebak nama pasien, log aktivitas tidak memuat nama pasien atau isi klinis, dan login terkunci setelah 5 percobaan salah.

---

## 6. Bisnis model dan rencana

<!-- Diisi tim. -->
