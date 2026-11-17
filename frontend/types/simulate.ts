import type { KesesuaianTujuan } from "./hospital";
import type { RiskDecision } from "./referral";

export type KompetensiAsumsi = "sesuai" | "sebagian" | "tidak";

/** Hanya masukan yang benar-benar dipakai model. Yang tidak diisi diambil dari rujukan dasar. */
export interface MasukanModel {
  diagnosis_code?: string;
  reason_category?: string;
  n90?: number;
  ns90?: number;
  n180?: number;
  hhi180?: number;
  to_dominant_dest?: boolean;
  sisrute_available?: boolean;
  sisrute_age_days?: number;
  dest_is_nearest?: boolean;
  narrative_quality?: "generic" | "specific";
}

/** Asumsi tentang RS tujuan. Bukan masukan model: hanya memengaruhi penilaian kesesuaian. */
export interface TujuanSimulasi {
  distance_km?: number;
  competency?: KompetensiAsumsi;
  equipment_available?: boolean;
}

export interface PermintaanSimulasi {
  base_referral_id?: string;
  inputs: MasukanModel;
  destination?: TujuanSimulasi;
}

export interface HasilSimulasi {
  simulated: true;
  notice: string;
  applied_inputs: string[];
  model: {
    score: number;
    category: "green" | "yellow" | "red";
    yellow_from: number;
    red_from: number;
    model_version: string;
    breakdown?: RiskDecision["breakdown"];
  };
  baseline?: { score: number; category: string; model_version: string; same_model_version: boolean };
  delta_score?: number;
  destination_fit?: KesesuaianTujuan;
  not_in_model?: string;
  /** Label narasi acuan yang dipakai ("generik" | "spesifik"); tidak ada bila narasi tidak diubah. Teks acuannya tidak dikirim. */
  narrative_reference?: string;
}
