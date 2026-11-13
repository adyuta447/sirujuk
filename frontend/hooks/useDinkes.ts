"use client";

import { useMemo } from "react";
import { useStatsSumber, useWilayahStats } from "./useStats";

export function useDinkes() {
  const { data: wilayah = [], isError, isLoading, refetch } = useWilayahStats();
  const { data: sumber } = useStatsSumber();
  // Tugas layar ini menemukan wilayah yang perlu dibina, jadi yang angkanya tertinggi tampil pertama.
  const terurut = useMemo(() => wilayah.slice().sort((a, b) => b.persenTinggi - a.persenTinggi), [wilayah]);

  return { terurut, kosong: wilayah.length === 0, isError, isLoading, refetch, sumber };
}
