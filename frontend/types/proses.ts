import type { IllustrationName } from "../components/atoms/Illustration";

/** Aksi yang menampilkan pop-up "sedang diproses". */
export type KunciProses = "skor" | "ubah" | "hitung-ulang" | "arsip" | "audit" | "klarifikasi" | "dampak" | "pengaturan" | "simulasi";

export interface TampilanProses {
  art: IllustrationName;
  judul: string;
  isi: string;
}
