"use client";

import { useState } from "react";
import { DEFAULT_REGION } from "../lib/constants";
import { bangunSegmen } from "../lib/queue-segments";
import type { RiskFilterKey } from "../types/queue";
import type { FilterRujukan } from "../types/referral-page";
import { useDebounced } from "./useDebounced";
import { useReferralPage } from "./useReferralPage";

const DARI_CHIP: Record<RiskFilterKey, Pick<FilterRujukan, "risk" | "status">> = {
  semua: {},
  ditahan: { status: "ditahan" },
  tinggi: { risk: "red" },
  sedang: { risk: "yellow" },
  rendah: { risk: "green" },
};

export function useReviewQueue(wilayah: string, query: string) {
  const [filter, setFilter] = useState<RiskFilterKey>("semua");
  const q = useDebounced(query.trim());
  const page = useReferralPage({ wilayah: wilayah === DEFAULT_REGION ? undefined : wilayah, q: q || undefined, ...DARI_CHIP[filter] });

  return { ...page, filter, setFilter, segments: bangunSegmen(page.data?.summary) };
}
