"use client";

import { DEFAULT_REGION } from "../lib/constants";
import { cocokCari } from "../lib/formatters";
import { usePagination } from "./usePagination";
import { useReferrals } from "./useReferral";

export function useReferralList(wilayah: string, query: string) {
  const { data: referrals = [], isError, isLoading } = useReferrals();
  const list = referrals.filter(
    (c) => (wilayah === DEFAULT_REGION || c.wilayah === wilayah) && cocokCari(c, query),
  );
  const pagination = usePagination(list, `${wilayah}|${query}`);

  return { isError, isLoading, ...pagination };
}
