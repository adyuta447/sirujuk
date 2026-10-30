import type { RiskDecision } from "../types/referral";

/** Apakah salah satu kode alasan ikut memicu skor. */
export function dipicu(decision: RiskDecision, ...kode: string[]): boolean {
  return (decision.reason_codes ?? []).some((k) => kode.includes(k));
}
