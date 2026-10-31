import type { RujukanCase } from "../lib/sirujuk-data";

/** Filter daftar rujukan yang dikerjakan server. Urutan (ditahan, risiko, skor) juga dari server. */
export interface FilterRujukan {
  wilayah?: string;
  risk?: "red" | "yellow" | "green";
  status?: "ditahan";
  q?: string;
}

export interface HalamanRujukan {
  items: RujukanCase[];
  next: string | null;
  total: number;
  // Mengikuti wilayah, status, dan q tetapi bukan risk, jadi chip risiko tetap punya angkanya.
  summary: { counts: { red: number; yellow: number; green: number }; held: number };
}
