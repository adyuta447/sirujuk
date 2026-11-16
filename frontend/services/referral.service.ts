import { api } from "./api";
import { mapStored } from "./referral-mapper";
import type { RujukanCase } from "../lib/sirujuk-data";
import type {
  ReferralEdit,
  RiskDecision,
  StoredReferral,
} from "../types/referral";
import { validateReferral, type ReferralInput } from "../lib/validate";

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

export async function scoreReferral(
  input: ReferralInput,
): Promise<RiskDecision> {
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
  return api<StoredReferral>(`/referrals/${enc(id)}`, {
    method: "PUT",
    body: JSON.stringify(edit),
  });
}

export function rescoreReferral(id: string) {
  return api<StoredReferral>(`/referrals/${enc(id)}/rescore`, {
    method: "POST",
  });
}

/** Arsip, bukan hapus: skor dan audit tetap tersimpan untuk banding. */
export function archiveReferral(id: string, note: string) {
  return api<null>(`/referrals/${enc(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ note }),
  });
}

export function submitClarification(id: string, text: string) {
  return api(`/referrals/${enc(id)}/clarifications`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
