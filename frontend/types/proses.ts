import type { IllustrationName } from "../components/atoms/Illustration";

/** Aksi yang menampilkan pop-up status. */
export type KunciProses = "skor" | "ubah" | "hitung-ulang" | "arsip" | "audit" | "klarifikasi" | "dampak" | "pengaturan" | "simulasi";

export interface TampilanProses {
  art: IllustrationName;
  judul: string;
  isi: string;
  /** Pop-up sesudah berhasil. Dihilangkan untuk aksi yang hasilnya langsung terlihat di halaman dan dijalankan berulang. */
  berhasil?: { judul: string; isi: string };
  /** Kalimat di daftar aktivitas bila berhasil (lampau). Dicatat untuk semua aksi, juga yang tanpa pop-up berhasil. */
  aktivitas: string;
  /** Judul pop-up bila gagal; isinya pesan galat dari server. */
  gagal: string;
}

export type HasilProses = { jenis: "berhasil"; kunci: KunciProses } | { jenis: "gagal"; kunci: KunciProses; pesan: string };
