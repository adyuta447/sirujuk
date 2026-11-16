import type { RiskLevel } from "../lib/sirujuk-data";
import type { KategoriRisiko } from "../types/risk-config";

export const KATEGORI_RISIKO: { key: KategoriRisiko; label: string; level: RiskLevel }[] = [
  { key: "green", label: "Hijau (rendah)", level: "rendah" },
  { key: "yellow", label: "Kuning (sedang)", level: "sedang" },
  { key: "red", label: "Merah (tinggi)", level: "tinggi" },
];
