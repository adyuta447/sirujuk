export type JenisRs = "umum" | "khusus" | "klinik_utama";

/** Satu faskes tujuan menurut direktori. Direktori demo bukan register resmi: `source` selalu ditampilkan. */
export interface Rs {
  id: string;
  name: string;
  wilayah: string;
  kind: JenisRs;
  class?: string;
  specialization?: string[];
  source: string;
}

export interface DaftarRs {
  items: Rs[];
  total: number;
}

export type HasilCek = "ok" | "partial" | "fail" | "unknown" | "info";
export type VonisKesesuaian = "sesuai" | "sebagian" | "tidak_sesuai" | "belum_terverifikasi";

export interface CekKesesuaian {
  name: string;
  result: HasilCek;
  detail: string;
}

/** Penilaian berbasis aturan atas tujuan rujukan. Tidak mengubah skor risiko (affects_score selalu false). */
export interface KesesuaianTujuan {
  verdict: VonisKesesuaian;
  checks: CekKesesuaian[];
  affects_score: boolean;
  basis: string;
}

export interface HasilKesesuaian {
  referral_id: string;
  destination_facility_id: string;
  diagnosis_code: string;
  fit: KesesuaianTujuan;
}
