import type { JenisRs } from "../types/hospital";

export const JENIS_RS: { key: JenisRs | ""; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "umum", label: "RS Umum" },
  { key: "khusus", label: "RS Khusus" },
  { key: "klinik_utama", label: "Klinik Utama" },
];
