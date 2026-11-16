import type { JenisRs } from "../types/hospital";

// Warna solid yang sudah dipakai di status; sengaja bukan merah/kuning/hijau, yang hanya untuk risiko.
export const JENIS_RS: { key: JenisRs | ""; label: string; bg: string }[] = [
  { key: "", label: "Semua", bg: "#64748B" },
  { key: "umum", label: "RS Umum", bg: "#1E3A5F" },
  { key: "khusus", label: "RS Khusus", bg: "#0E1B2A" },
  { key: "klinik_utama", label: "Klinik Utama", bg: "#64748B" },
];
