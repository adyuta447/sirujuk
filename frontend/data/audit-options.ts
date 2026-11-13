import type { DecisionOptionData } from "../types/audit";

export const OPSI_KEPUTUSAN: DecisionOptionData[] = [
  {
    value: "valid",
    label: "Rujukan aman",
    desc: "Rujukan sesuai prosedur dan alasan medisnya jelas.",
    level: "rendah",
  },
  {
    value: "perlu-klarifikasi",
    label: "Perlu diklarifikasi",
    desc: "Data belum cukup, perlu konfirmasi ke fasilitas.",
    level: "sedang",
  },
  {
    value: "tidak-valid",
    label: "Rujukan tidak sesuai",
    desc: "Ada prosedur yang belum terpenuhi atau pola yang perlu ditindaklanjuti.",
    level: "tinggi",
  },
];
