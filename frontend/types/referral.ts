export type Decision = "green" | "yellow" | "red";
export type RiskDecision = {
  referral_id: string;
  score: number;
  decision: Decision;
  requires_human_review: boolean;
  status: "SCORED" | "ACCEPTED_ASYNC"; // ACCEPTED_ASYNC: no score yet, the referral still proceeds
  model_version?: string;
  reason_codes?: string[];
  // Backend selalu mengirim objek (termasuk skor dummy: code DUMMY_*).
  reasons?: { code: string; detail: string; contribution: number }[];
  signals: { nlp_similarity: number; anomaly_score: number; fraud_score: number };
  signals_source?: string;
  // Masukan persis yang dilihat ML saat menghitung skor (untuk menjelaskan skor saat banding).
  features?: {
    doctor: { n90: number; ns90: number | null; n180: number; hhi180: number | null };
    sisrute_available: boolean;
    sisrute_age_days: number;
  };
  scored_at?: string;
  // Ambang kategori dan versi daftar diagnosis yang dipakai ML (dari backend, bukan dihitung frontend).
  yellow_from?: number;
  red_from?: number;
  diagnosis_version?: string;
  // Angka mentah per indikator dari ML (bila backend meneruskannya).
  indicators?: {
    ns?: { value: number | null; peer_p95: number | null; n: number; min_n: number; applies: boolean };
    hhi?: { value: number | null; n: number; min_n?: number; observe_from: number; high_from: number; to_dominant_destination?: boolean; nearest_known?: boolean };
    sisrute?: { flag: boolean; age_days: number; weight: number };
    narrative?: { similarity: number; p10: number | null; mapped?: boolean };
  };
};

export type ClaimStatus = "normal" | "ditahan" | "dilepas" | "temuan-terkonfirmasi";

export type StoredReferral = {
  request: {
    referral_id: string;
    patient_name: string;
    origin_wilayah?: string;
    doctor_id: string;
    origin_facility_id: string;
    destination_facility_id: string;
    diagnosis_code: string;
    reason: string;
    clinical_narrative: string;
    issued_at: string;
  };
  decision: RiskDecision;
  audits: { reviewer: string; outcome: string; note: string; reviewed_at: string }[];
  // normal | ditahan | dilepas | temuan-terkonfirmasi. "selesai" hanya bila final.
  claim_status?: ClaimStatus;
  final?: boolean;
  synthetic?: boolean; // true bila baris berasal dari seed demo
  history?: { score: number; decision: Decision; model_version: string; scored_at: string }[];
  clarifications?: { author: string; text: string; at: string }[];
};

export type ReferralEdit = Pick<
  StoredReferral["request"],
  "doctor_id" | "origin_facility_id" | "destination_facility_id" | "diagnosis_code" | "reason" | "clinical_narrative"
>;

export type Stats = {
  synthetic?: boolean;
  wilayah: {
    wilayah: string;
    faskes: number;
    rujukan: number;
    persen_tinggi: number;
    median_ns: number | null;
    hhi_rata: number | null;
  }[];
  dokter: {
    doctor_id: string;
    faskes: string;
    total_rujukan: number;
    risiko_tinggi: number;
    persentase: number;
    narasi: string;
    darurat?: number;
    persen_darurat?: number;
  }[];
};
