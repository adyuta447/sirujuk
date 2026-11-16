export type KategoriRisiko = "green" | "yellow" | "red";

export interface AksiKategori {
  recommendation: string;
  alert: boolean;
}

/** Pengaturan batas kategori nasional dari backend. version 0 = belum pernah diatur (batas bawaan model). */
export interface KonfigRisiko {
  yellow_from: number;
  red_from: number;
  actions: Record<KategoriRisiko, AksiKategori>;
  version: number;
  updated_by?: string;
  updated_at?: string;
  source: "configured" | "model_default";
  model_reference: { yellow_from: number; red_from: number };
}

export interface DampakRisiko {
  total: number;
  current: Record<KategoriRisiko, number>;
  proposed: Record<KategoriRisiko, number>;
  changed: number;
  note: string;
}

export interface InputKonfigRisiko {
  yellow_from: number;
  red_from: number;
  actions: Record<KategoriRisiko, AksiKategori>;
  version: number;
}

export interface HasilKonfigRisiko {
  config: KonfigRisiko;
  impact: DampakRisiko;
}
