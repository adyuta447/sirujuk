import type { RiskLevel } from "../lib/sirujuk-data";

// Kategori sepenuhnya dari keputusan backend; frontend tidak punya ambang skor sendiri.
export const RISK_DARI_KEPUTUSAN: Record<string, RiskLevel> = {
  red: "tinggi",
  yellow: "sedang",
  green: "rendah",
};
