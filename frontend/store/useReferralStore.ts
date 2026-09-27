import { create } from "zustand";
import type { RiskDecision } from "../types/referral";

type ReferralState = {
  decision: RiskDecision | null;
  setDecision: (decision: RiskDecision | null) => void;
};

export const useReferralStore = create<ReferralState>((set) => ({
  decision: null,
  setDecision: (decision) => set({ decision }),
}));
