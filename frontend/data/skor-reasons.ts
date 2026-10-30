import type { ReasonOption } from "../types/skor";

// Nilai ini sengaja tidak memuat kata kunci yang salah dibaca backend (mis. "dokter" terbaca keterbatasan SDM).
export const ALASAN: ReasonOption[] = [
  { teks: "Keterbatasan alat", kategori: "equipment" },
  { teks: "Keterbatasan SDM", kategori: "staff" },
  { teks: "Indikasi klinis perlu penanganan spesialis", kategori: "clinical" },
];
