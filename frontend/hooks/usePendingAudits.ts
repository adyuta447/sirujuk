"use client";

import { usePagination } from "./usePagination";
import { useReferrals } from "./useReferral";

/** Rujukan yang belum selesai diaudit, berhalaman. */
export function usePendingAudits() {
  const { data: referrals = [], isError } = useReferrals();
  const pagination = usePagination(
    referrals.filter((c) => c.status !== "selesai"),
    "",
  );

  return { isError, ...pagination };
}
