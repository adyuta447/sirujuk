"use client";

import { useState } from "react";
import { cocokCari } from "../lib/formatters";
import { bangunSegmen } from "../lib/queue-segments";
import type { RiskFilterKey } from "../types/queue";
import { useAuditQueue } from "./useAuditQueue";
import { usePagination } from "./usePagination";
import { useReferrals } from "./useReferral";

export function useReviewQueue(wilayah: string, query: string) {
  const [filter, setFilter] = useState<RiskFilterKey>("semua");
  const { data: referrals = [], isError, isLoading } = useReferrals();
  const { base, filtered, counts } = useAuditQueue(
    referrals.filter((c) => cocokCari(c, query)),
    wilayah,
    filter,
  );
  const pagination = usePagination(filtered, `${wilayah}|${query}|${filter}`);

  return {
    filter,
    setFilter,
    segments: bangunSegmen(base.length, counts),
    isError,
    isLoading,
    ...pagination,
  };
}
