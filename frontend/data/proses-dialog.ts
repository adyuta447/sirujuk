import type { KunciProses, TampilanProses } from "../types/proses";

// Ilustrasi proses mengikuti aksinya: daftar dengan kaca pembesar untuk penilaian model, tray untuk arsip,
// papan periksa untuk audit, gelembung percakapan untuk klarifikasi, grafik untuk batas risiko.
// Hasilnya selalu sama: "selesai" untuk berhasil, dokumen bertanda seru untuk gagal.
export const PROSES: Record<KunciProses, TampilanProses> = {
  skor: {
    art: "hero",
    judul: "Menghitung skor rujukan…",
    isi: "Model sedang menilai rujukan ini. Mohon tunggu sebentar.",
    berhasil: { judul: "Skor selesai dihitung", isi: "Hasilnya tampil di halaman ini." },
    aktivitas: "Skor rujukan dihitung",
    gagal: "Skor gagal dihitung",
  },
  ubah: {
    art: "hero",
    judul: "Menyimpan perubahan…",
    isi: "Skor dihitung ulang oleh model setelah perubahan disimpan.",
    berhasil: { judul: "Perubahan tersimpan", isi: "Skor sudah dihitung ulang oleh model." },
    aktivitas: "Perubahan rujukan disimpan",
    gagal: "Perubahan gagal disimpan",
  },
  "hitung-ulang": {
    art: "hero",
    judul: "Menghitung ulang skor…",
    isi: "Model sedang menilai ulang rujukan ini.",
    berhasil: { judul: "Skor diperbarui", isi: "Model sudah menilai ulang rujukan ini." },
    aktivitas: "Skor dihitung ulang",
    gagal: "Skor gagal dihitung ulang",
  },
  arsip: {
    art: "stat-masuk",
    judul: "Mengarsipkan rujukan…",
    isi: "Skor dan riwayat audit tetap tersimpan untuk banding.",
    berhasil: { judul: "Rujukan diarsipkan", isi: "Skor dan riwayat audit tetap tersimpan untuk banding." },
    aktivitas: "Rujukan diarsipkan",
    gagal: "Rujukan gagal diarsipkan",
  },
  audit: {
    art: "audit",
    judul: "Menyimpan hasil audit…",
    isi: "Keputusan dan catatan Anda sedang dicatat.",
    berhasil: { judul: "Hasil audit tersimpan", isi: "Keputusan dan catatan Anda sudah dicatat." },
    aktivitas: "Hasil audit disimpan",
    gagal: "Hasil audit gagal disimpan",
  },
  klarifikasi: {
    art: "klarifikasi",
    judul: "Mengirim penjelasan…",
    isi: "Penjelasan Anda sedang dikirim ke verifikator.",
    berhasil: { judul: "Penjelasan terkirim", isi: "Verifikator akan membacanya." },
    aktivitas: "Penjelasan dikirim",
    gagal: "Penjelasan gagal dikirim",
  },
  dampak: {
    art: "analitik",
    judul: "Menghitung dampak batas baru…",
    isi: "Rujukan yang sudah dinilai sedang dibandingkan dengan batas usulan.",
    aktivitas: "Dampak batas risiko dihitung",
    gagal: "Dampak gagal dihitung",
  },
  pengaturan: {
    art: "analitik",
    judul: "Menyimpan pengaturan risiko…",
    isi: "Batas baru berlaku untuk rujukan yang dinilai setelah ini.",
    berhasil: { judul: "Pengaturan tersimpan", isi: "Batas baru berlaku untuk rujukan yang dinilai setelah ini." },
    aktivitas: "Pengaturan risiko disimpan",
    gagal: "Pengaturan gagal disimpan",
  },
  simulasi: {
    art: "hero",
    judul: "Menjalankan simulasi…",
    isi: "Hasilnya tidak disimpan dan tidak mengubah rujukan mana pun.",
    aktivitas: "Simulasi dijalankan",
    gagal: "Simulasi gagal dijalankan",
  },
};
