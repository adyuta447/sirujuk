/** Satu faskes dengan jumlah rujukan yang ditandai model (kuning atau merah). */
export interface StatFaskes {
  id: string;
  total: number;
  flagged: number;
  red: number;
  flagged_percent: number;
}

/** Estimasi biaya hanya ada bila pemilik sistem menetapkan asumsi. Selalu estimasi, tidak pernah angka aktual. */
export interface EstimasiBiaya {
  available: boolean;
  kind: "estimasi";
  reason?: string;
  prevented_referrals?: number;
  amount_idr?: number;
  assumptions?: string[];
  disclaimer: string;
}

export interface Pencegahan {
  total: number;
  kns_total: number;
  kns_percent: number;
  kns_flagged: number;
  kns_confirmed_invalid: number;
  by_fktp: StatFaskes[];
  by_fkrtl: StatFaskes[];
  cost: EstimasiBiaya;
  basis: string;
}
