import type { HalamanRujukan } from "../types/referral-page";
import type { RiskSegment } from "../types/queue";

/** Chip antrean dari ringkasan server, jadi angkanya tidak bergantung pada halaman yang sedang dimuat. */
export function bangunSegmen(summary?: HalamanRujukan["summary"]): RiskSegment[] {
  const { red = 0, yellow = 0, green = 0 } = summary?.counts ?? {};
  return [
    { key: "semua", label: "Semua", count: red + yellow + green },
    { key: "ditahan", label: "Klaim ditahan", count: summary?.held ?? 0 },
    { key: "tinggi", label: "Tinggi", count: red },
    { key: "sedang", label: "Sedang", count: yellow },
    { key: "rendah", label: "Rendah", count: green },
  ];
}
