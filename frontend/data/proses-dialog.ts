import type { KunciProses, TampilanProses } from "../types/proses";

// Ilustrasi mengikuti aksinya: daftar dengan kaca pembesar untuk penilaian model, tray untuk arsip,
// papan periksa untuk audit, gelembung percakapan untuk klarifikasi, grafik untuk batas risiko.
export const PROSES: Record<KunciProses, TampilanProses> = {
  skor: { art: "hero", judul: "Menghitung skor rujukan…", isi: "Model sedang menilai rujukan ini. Mohon tunggu sebentar." },
  ubah: { art: "hero", judul: "Menyimpan perubahan…", isi: "Skor dihitung ulang oleh model setelah perubahan disimpan." },
  "hitung-ulang": { art: "hero", judul: "Menghitung ulang skor…", isi: "Model sedang menilai ulang rujukan ini." },
  arsip: { art: "stat-masuk", judul: "Mengarsipkan rujukan…", isi: "Skor dan riwayat audit tetap tersimpan untuk banding." },
  audit: { art: "audit", judul: "Menyimpan hasil audit…", isi: "Keputusan dan catatan Anda sedang dicatat." },
  klarifikasi: { art: "klarifikasi", judul: "Mengirim penjelasan…", isi: "Penjelasan Anda sedang dikirim ke verifikator." },
  dampak: { art: "analitik", judul: "Menghitung dampak batas baru…", isi: "Rujukan yang sudah dinilai sedang dibandingkan dengan batas usulan." },
  pengaturan: { art: "analitik", judul: "Menyimpan pengaturan risiko…", isi: "Batas baru berlaku untuk rujukan yang dinilai setelah ini." },
  simulasi: { art: "hero", judul: "Menjalankan simulasi…", isi: "Hasilnya tidak disimpan dan tidak mengubah rujukan mana pun." },
};
