import type { RiskLevel } from "./sirujuk-data";

const HHI_PERLU_KLARIFIKASI = 2500;
const HHI_OBSERVASI = 1500;

export function levelHhi(hhi: number): RiskLevel {
  if (hhi > HHI_PERLU_KLARIFIKASI) return "tinggi";
  return hhi >= HHI_OBSERVASI ? "sedang" : "rendah";
}
