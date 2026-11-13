import { Check, Eye, OctagonAlert } from "lucide-react";
import type { Outcome } from "../types/landing";

export const KATEGORI: Outcome[] = [
  { label: "Lolos", isi: "Lolos otomatis. Tidak perlu dicek manual.", tone: "rendah", Icon: Check },
  { label: "Perlu Ditinjau", isi: "Masuk antrean verifikator dengan prioritas menengah.", tone: "sedang", Icon: Eye },
  { label: "Risiko Tinggi", isi: "Klaim ditahan sementara sampai audit medis selesai.", tone: "tinggi", Icon: OctagonAlert },
];
