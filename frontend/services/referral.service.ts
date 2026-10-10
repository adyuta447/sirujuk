import { api } from "./api";
import type { RujukanCase, RiskLevel } from "../lib/sirujuk-data";
import { namaDokter } from "../lib/sirujuk-data";
import type { ReferralEdit, RiskDecision, StoredReferral } from "../types/referral";
import { bangunIndikator } from "../lib/indikator";
import { validateReferral, type ReferralInput } from "../lib/validate";

const WILAYAH_OF: Record<string, string> = {
  "fktp-cilincing": "Jakarta Utara",
  "fktp-penjaringan": "Jakarta Utara",
  "fktp-tambora": "Jakarta Barat",
  "klinik-mitra-sehat": "Jakarta Barat",
};

// Direktori ID dokter dummy milik seeder backend (d-001..d-006) ke nama tampilan.
// Empat pertama sama dengan DOKTER_RISIKO supaya tautan "profil dokter" tetap nyambung.
const DOKTER_SEED: Record<string, string> = {
  "d-001": "dr. Andi Pratama",
  "d-002": "dr. Rini Kusuma",
  "d-003": "dr. Siti Aminah",
  "d-004": "dr. Budi Santoso",
  "d-005": "dr. Maya Putri",
  "d-006": "dr. Agus Wijaya",
};

const PESERTA = ["PBI", "Pekerja", "Mandiri"];

function riskOf(decision: string, score: number): RiskLevel {
  if (decision === "red" || score >= 80) return "tinggi";
  if (decision === "yellow" || score >= 50) return "sedang";
  return "rendah";
}

function hashSum(s: string): number {
  let total = 0;
  for (let i = 0; i < s.length; i++) total += s.charCodeAt(i);
  return total;
}

export function mapStored(item: StoredReferral): RujukanCase {
  const { request, decision } = item;
  const audits = item.audits ?? [];
  const id = request.referral_id;
  const risk = RISK_DARI_KEPUTUSAN[decision.decision] ?? "sedang";
  const score = Math.round(decision.score);
  const reasons = (decision.reasons ?? []).map((r) => r.detail || r.code).map((judul, i) => ({
    judul,
    penjelasan: i === 0 ? request.clinical_narrative || request.reason : request.reason,
  }));
  return {
    id,
    noRujukan: id.toUpperCase(),
    pasien: request.patient_name,
    // Usia dan jenis peserta belum ada di backend; tidak dikarang.
    fasalOrigin: request.origin_facility_id,
    fasalTujuan: request.destination_facility_id,
    wilayah: request.origin_wilayah || WILAYAH_OF[request.origin_facility_id] || "Belum tercatat",
    diagnosa: request.diagnosis_code,
    dokter: namaDokter(request.doctor_id),
    tanggal: new Date(request.issued_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    risk,
    riskScore: score,
    alasan: risk === "rendah" ? [] : reasons,
    // Selesai hanya bila final. Hasil perlu-klarifikasi sudah ada audit tetapi belum final.
    status: item.final ? "selesai" : audits.length > 0 ? "sedang-diaudit" : "menunggu",
    claimStatus: item.claim_status,
    synthetic: item.synthetic,
    indikator: bangunIndikator(decision),
    kodeAlasan: decision.reason_codes?.join(", "),
    narasi: request.clinical_narrative,
    alasanRujukan: request.reason,
    riwayatSkor: (item.history ?? []).map((h) => ({ skor: Math.round(h.score), tanggal: h.scored_at, versiModel: h.model_version })),
    klarifikasi: (item.clarifications ?? []).map((c) => ({ penulis: c.author, teks: c.text, tanggal: c.at })),
  };
}

/** Data langsung dari backend. Tidak ada data cadangan: gagal berarti error, kosong berarti kosong. */
export async function getReferrals(): Promise<RujukanCase[]> {
  const items = await api<StoredReferral[]>("/referrals");
  return Array.isArray(items) ? items.map(mapStored) : [];
}

export function submitAudit(referralId: string, outcome: string, note: string) {
  return api("/audits", {
    method: "POST",
    body: JSON.stringify({ referral_id: referralId, outcome, note }),
  });
}

export async function scoreReferral(input: ReferralInput): Promise<RiskDecision> {
  const error = validateReferral(input);
  if (error) throw new Error(error);
  const { referral_no, ...rest } = input;
  return api<RiskDecision>("/referrals/score", {
    method: "POST",
    headers: { "Idempotency-Key": referral_no },
    body: JSON.stringify({ ...rest, issued_at: new Date().toISOString() }),
  });
}

const enc = encodeURIComponent;

/** Ubah isi rujukan; backend menghitung ulang lewat ML. */
export function updateReferral(id: string, edit: ReferralEdit) {
  return api<StoredReferral>(`/referrals/${enc(id)}`, { method: "PUT", body: JSON.stringify(edit) });
}

export function rescoreReferral(id: string) {
  return api<StoredReferral>(`/referrals/${enc(id)}/rescore`, { method: "POST" });
}

/** Arsip, bukan hapus: skor dan audit tetap tersimpan untuk banding. */
export function archiveReferral(id: string, note: string) {
  return api<null>(`/referrals/${enc(id)}`, { method: "DELETE", body: JSON.stringify({ note }) });
}

export function submitClarification(id: string, text: string) {
  return api(`/referrals/${enc(id)}/clarifications`, { method: "POST", body: JSON.stringify({ text }) });
}
