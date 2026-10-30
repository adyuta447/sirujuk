import type { Indikator } from "./sirujuk-data";
import type { RiskDecision } from "../types/referral";
import { bangunIndikatorFitur } from "./indikator-fitur";
import { bangunIndikatorRinci } from "./indikator-rinci";

export function bangunIndikator(decision: RiskDecision): Indikator[] {
  return bangunIndikatorRinci(decision) ?? bangunIndikatorFitur(decision);
}
