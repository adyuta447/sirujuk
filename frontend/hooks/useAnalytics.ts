"use client";

import { ringkas } from "../lib/ringkasan";
import { useReferrals } from "./useReferral";
import { useDokterStats } from "./useStats";

export function useAnalytics() {
  const { data: referrals = [] } = useReferrals();
  const { data: dokterList = [] } = useDokterStats();

  return { referrals, dokterList, ringkasan: ringkas(referrals) };
}
