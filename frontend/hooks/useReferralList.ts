"use client";

import { DEFAULT_REGION } from "../lib/constants";
import { useDebounced } from "./useDebounced";
import { useReferralPage } from "./useReferralPage";

export function useReferralList(wilayah: string, query: string) {
  const q = useDebounced(query.trim());
  return useReferralPage({ wilayah: wilayah === DEFAULT_REGION ? undefined : wilayah, q: q || undefined });
}
