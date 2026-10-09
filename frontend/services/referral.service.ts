import { api } from "./api";
import { CASES } from "../lib/sirujuk-data";
import type { RujukanCase, RiskLevel } from "../lib/sirujuk-data";
import type { StoredReferral } from "../types/referral";

const WILAYAH_OF: Record<string, string> = {
  "fktp-cilincing": "Jakarta Utara",
  "fktp-penjaringan": "Jakarta Utara",
  "fktp-tambora": "Jakarta Barat",
  "klinik-mitra-sehat": "Jakarta Barat",
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
  const h = hashSum(id);
  const risk = riskOf(decision.decision, decision.score);
  const score = Math.round(decision.score);
  const reasons = (decision.reasons ?? []).map((judul, i) => ({
    judul,
    penjelasan: i === 0 ? request.clinical_narrative || request.reason : request.reason,
  }));
  return {
    id,
    noRujukan: id.toUpperCase(),
    pasien: `Pasien ${id}`,
    usia: 25 + (h % 45),
    jenisPeserta: PESERTA[h % PESERTA.length],
    fasalOrigin: request.origin_facility_id,
    fasalTujuan: request.destination_facility_id,
    wilayah: WILAYAH_OF[request.origin_facility_id] ?? "Jakarta Utara",
    diagnosa: request.diagnosis_code,
    dokter: request.doctor_id,
    tanggal: new Date(request.issued_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    risk,
    riskScore: score,
    alasan: risk === "rendah" ? [] : reasons,
    status: audits.length > 0 ? "selesai" : "menunggu",
  };
}

export async function getReferrals(): Promise<RujukanCase[]> {
  try {
    const items = await api<StoredReferral[]>("/referrals");
    if (Array.isArray(items) && items.length > 0) return items.map(mapStored);
    return CASES;
  } catch {
    return CASES;
  }
}

export function submitAudit(referralId: string, outcome: string, note: string) {
  return api("/audits", {
    method: "POST",
    body: JSON.stringify({ referral_id: referralId, reviewer: "verifikator", outcome, note }),
  });
}
