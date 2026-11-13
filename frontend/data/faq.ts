import type { FaqEntry } from "../types/faq";

export const TANYA: FaqEntry[] = [
  { tanya: "Apakah skor tinggi berarti dokter berbuat curang?", jawab: "Tidak. Skor 0–100 hanya menentukan urutan antrean: hijau lolos, kuning ditinjau, merah diaudit lebih dulu. Skor merah pun belum tentu salah. Dokter lebih dulu diminta klarifikasi, dan tidak ada sanksi yang keluar dari sistem." },
  { tanya: "Siapa yang memutuskan rujukan ditahan?", jawab: "Selalu manusia: verifikator BPJS untuk antrean harian, TKMKB untuk kasus merah. Sistem hanya mengusulkan prioritas, lalu mencatat setiap keputusan beserta alasannya sehingga bisa diaudit balik." },
  { tanya: "Bagaimana dengan daerah yang rumah sakitnya terbatas?", jawab: "Konteks itu ikut dihitung. Konsentrasi RS tujuan dibaca bersama ketersediaan alat dan SDM di faskes asal. Kalau memang tidak ada pilihan lain, sistem menurunkan bobot sinyalnya. Ambang kuning dan merah pun dikalibrasi dari sebaran skor nyata, bukan angka mati, dan dokter bisa menjelaskan lewat klarifikasi." },
  { tanya: "Apakah data pasien terlihat?", jawab: "Ya, tetapi hanya untuk petugas berwenang yang sudah login: verifikator, TKMKB, dan dokter yang diminta klarifikasi. Dinas Kesehatan hanya melihat angka agregat per wilayah tanpa identitas pasien. Sistem mencatat setiap keputusan dan klarifikasi." },
  { tanya: "Dari mana skor berasal?", jawab: "Empat indikator yang masing-masing menunjukkan nilai dan kesegaran datanya: porsi rujukan keluhan ringan, konsentrasi RS tujuan, ketersediaan alat/SDM di faskes asal, dan kewajaran narasi klinis. Kalau data pendukungnya basi, bobotnya otomatis turun, jadi ini bukan angka kotak hitam." },
  { tanya: "Apa yang belum bisa dideteksi?", jawab: "Keluhan yang dipalsukan pasien, kolusi dokter dengan pasien, dan rujukan yang dokumennya rapi tapi indikasi medisnya lemah, yaitu pola yang hanya terlihat lewat pemeriksaan fisik atau kunjungan lapangan. Itu sebabnya skor tidak pernah menjadi vonis." },
];
