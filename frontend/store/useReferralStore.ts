import { useState } from "react";
import type { RiskDecision } from "../types/referral";
export function useReferralStore() {
  const [decision, setDecision] = useState<RiskDecision | null>(null);
  return { decision, setDecision };
}
