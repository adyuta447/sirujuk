"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { bacaFormKonfig } from "../lib/risk-config-form";
import { previewRiskConfig, saveRiskConfig } from "../services/risk-config.service";
import type { AksiKategori, DampakRisiko, KategoriRisiko, KonfigRisiko } from "../types/risk-config";

export type RiskConfigFormState = ReturnType<typeof useRiskConfigForm>;

/** Form batas kategori. Simpan baru aktif setelah pratinjau dampak untuk isian yang sama. */
export function useRiskConfigForm(konfig: KonfigRisiko) {
  const queryClient = useQueryClient();
  const [yellow, setYellow] = useState(String(konfig.yellow_from));
  const [red, setRed] = useState(String(konfig.red_from));
  const [actions, setActions] = useState(konfig.actions);
  const [galat, setGalat] = useState<string | null>(null);
  const [dampak, setDampak] = useState<DampakRisiko | null>(null);
  const pratinjau = useMutation({ mutationFn: previewRiskConfig, onSuccess: (h) => setDampak(h.impact) });
  const simpan = useMutation({
    mutationFn: saveRiskConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["risk-config"] }),
  });

  const berubah = () => {
    setDampak(null);
    setGalat(null);
    simpan.reset();
  };
  const baca = () => {
    const hasil = bacaFormKonfig({ yellow, red, actions, version: konfig.version });
    setGalat("galat" in hasil ? hasil.galat : null);
    return "input" in hasil ? hasil.input : null;
  };

  return {
    yellow,
    red,
    actions,
    dampak,
    galat: galat ?? (pratinjau.error ?? simpan.error)?.message ?? null,
    sibuk: pratinjau.isPending || simpan.isPending,
    tersimpan: simpan.isSuccess,
    setYellow: (v: string) => (setYellow(v), berubah()),
    setRed: (v: string) => (setRed(v), berubah()),
    setAksi: (k: KategoriRisiko, a: AksiKategori) => (setActions({ ...actions, [k]: a }), berubah()),
    hitungDampak: () => {
      const input = baca();
      if (input) pratinjau.mutate(input);
    },
    simpan: () => {
      const input = baca();
      if (input && dampak) simpan.mutate(input);
    },
  };
}
