import { api } from "./api";
import type { RiskDecision } from "../types/referral";
export function getRiskDecision(referralId: string) {
  return api<RiskDecision>(`/referrals/${encodeURIComponent(referralId)}`);
}
