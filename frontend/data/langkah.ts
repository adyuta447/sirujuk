import type { Langkah } from "../types/langkah";

export const LANGKAH: Langkah[] = [
  { judul: "Cek data fasilitas", isi: "Alasan rujukan dicocokkan dengan data alat dan tenaga medis di SISRUTE. Kalau datanya sudah lama tidak diperbarui, bobotnya diturunkan.", art: "dinkes-terang" },
  { judul: "Lihat pola dokter", isi: "Rasio rujukan ringan dan konsentrasi rumah sakit tujuan dibandingkan dengan dokter sejenis di wilayah yang sama.", art: "analitik-terang" },
  { judul: "Baca narasi klinis", isi: "Catatan dokter dicek: terlalu umum atau sesuai panduan praktik klinis untuk diagnosis itu.", art: "klarifikasi-terang" },
  { judul: "Hasilnya satu skor", isi: "Skor 0 sampai 100 menentukan rujukan lolos, ditinjau verifikator, atau ditahan untuk audit medis.", art: "selesai-terang" },
];
