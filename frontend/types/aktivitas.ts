import type { KunciProses } from "./proses";

/** Satu aksi pengguna yang tercatat di sesi ini. */
export interface Aktivitas {
  id: string;
  waktu: string; // ISO
  kunci: KunciProses;
  jenis: "berhasil" | "gagal";
  judul: string;
  /** Yang dikenai aksi, mis. nomor rujukan. */
  konteks?: string;
  /** Pesan galat, hanya untuk yang gagal. */
  pesan?: string;
  dibaca: boolean;
}
