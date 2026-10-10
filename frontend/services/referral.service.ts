import { api } from "./api";
import { CASES } from "../lib/sirujuk-data";
import type { RujukanCase } from "../lib/sirujuk-data";
import type { RiskDecision } from "../types/referral";
import { validateReferral, type ReferralInput } from "../lib/validate";

export async function getReferrals(): Promise<RujukanCase[]> {
  return CASES;
}

export function getRiskDecision(referralId: string) {
  return api<RiskDecision>(`/referrals/${encodeURIComponent(referralId)}`);
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
