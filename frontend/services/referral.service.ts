import { api } from "./api";
import { CASES } from "../lib/sirujuk-data";
import type { RujukanCase } from "../lib/sirujuk-data";
import type { RiskDecision } from "../types/referral";

export async function getReferrals(): Promise<RujukanCase[]> {
  return CASES;
}

export function getRiskDecision(referralId: string) {
  return api<RiskDecision>(`/referrals/${encodeURIComponent(referralId)}`);
}
