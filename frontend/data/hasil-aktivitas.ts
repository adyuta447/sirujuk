import type { HasilAktivitas } from "../types/activity";

// Warna yang sudah ada di app; ikon dan teks selalu menyertai warna.
export const HASIL_AKTIVITAS: Record<HasilAktivitas, { label: string; warna: string }> = {
  ok: { label: "Berhasil", warna: "#17803F" },
  denied: { label: "Tidak diizinkan", warna: "#9A5A08" },
  rejected: { label: "Ditolak", warna: "#9A5A08" },
  failed: { label: "Gagal di server", warna: "#C42222" },
};
