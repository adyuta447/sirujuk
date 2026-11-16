import type { RincianSkor } from "./sirujuk-data";
import type { RiskDecision } from "../types/referral";

/** Rincian skor apa adanya dari backend (yang bersumber dari model). Frontend tidak menghitung porsi sendiri. */
export function bangunRincianSkor(decision: Pick<RiskDecision, "breakdown">): RincianSkor | undefined {
  const b = decision.breakdown;
  if (!b) return undefined;
  return {
    ringkasan: b.summary,
    faktor: b.layers.filter((l) => l.share > 0).map((l) => ({ layer: l.layer, label: l.label, persen: Math.round(l.share) })),
    dominan: b.dominant,
    dasar: b.basis,
    sumber: b.source,
  };
}
