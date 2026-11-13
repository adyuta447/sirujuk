import type { RiskLevel } from "./sirujuk-data";
import type { RiskSegment } from "../types/queue";

export function bangunSegmen(
  total: number,
  counts: Record<RiskLevel, number>,
): RiskSegment[] {
  return [
    { key: "semua", label: "Semua", count: total },
    { key: "tinggi", label: "Tinggi", count: counts.tinggi },
    { key: "sedang", label: "Sedang", count: counts.sedang },
    { key: "rendah", label: "Rendah", count: counts.rendah },
  ];
}
