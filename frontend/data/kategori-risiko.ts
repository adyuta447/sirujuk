import type { KategoriRisiko } from "../types/risk-config";

export const KATEGORI_RISIKO: { key: KategoriRisiko; label: string }[] = [
  { key: "green", label: "Hijau (rendah)" },
  { key: "yellow", label: "Kuning (sedang)" },
  { key: "red", label: "Merah (tinggi)" },
];
