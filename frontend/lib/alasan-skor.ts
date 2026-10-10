import type { RiskLevel } from "./sirujuk-data";
import type { Decision } from "../types/referral";

// Hanya terjemahan tampilan. Keputusan dan skor tetap dihitung backend.
export const KODE_ALASAN: Record<string, string> = {
  NS_ABOVE_PEER_P95: "Rujukan keluhan ringan di atas dokter sejenis",
  HHI_HIGH_CONCENTRATION: "Rujukan menumpuk di satu rumah sakit",
  FACILITY_AVAILABLE_PER_SISRUTE: "Alat atau tenaga ternyata tersedia di faskes asal",
  NARRATIVE_GENERIC: "Narasi dokter terlalu umum",
  INSUFFICIENT_HISTORY: "Riwayat dokter belum cukup",
  SISRUTE_STALE: "Data SISRUTE sudah lama tidak diperbarui",
};

export const LEVEL_DARI_KEPUTUSAN: Record<Decision, RiskLevel> = {
  green: "rendah",
  yellow: "sedang",
  red: "tinggi",
};
