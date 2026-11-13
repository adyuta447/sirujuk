"use client";

import { useReferrals } from "./useReferral";

/** Rujukan ditandai (bukan risiko rendah) yang belum selesai, kandidat permintaan klarifikasi. */
export function usePendingClarifications() {
  const { data: referrals = [] } = useReferrals();

  return referrals.filter((c) => c.risk !== "rendah" && c.status !== "selesai");
}
