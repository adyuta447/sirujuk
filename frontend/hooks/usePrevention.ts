"use client";

import { useQuery } from "@tanstack/react-query";
import { getStats } from "../services/stats.service";

/** Blok pencegahan dari /stats; null bila backend tidak mengirimnya (daftar diagnosis FKTP belum dimuat). */
export function usePrevention() {
  return useQuery({ queryKey: ["stats"], queryFn: getStats, staleTime: 60 * 1000, select: (s) => s.prevention ?? null });
}
