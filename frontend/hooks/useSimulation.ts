"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { FORM_SIMULASI_KOSONG } from "../data/form-simulasi-kosong";
import { denganProses } from "../lib/dengan-proses";
import { bangunPermintaanSimulasi } from "../lib/simulate-form";
import { simulate } from "../services/simulate.service";
import type { FormSimulasi } from "../types/simulate-form";

export type SimulationState = ReturnType<typeof useSimulation>;

/** Isian dan hasil simulasi. Tidak ada yang disimpan: hasil hanya hidup di layar ini. */
export function useSimulation() {
  const [form, setForm] = useState<FormSimulasi>(FORM_SIMULASI_KOSONG);
  const [galat, setGalat] = useState<string | null>(null);
  const jalan = useMutation({ mutationFn: (input: Parameters<typeof simulate>[0]) => denganProses("simulasi", () => simulate(input)) });

  return {
    form,
    ubah: (kolom: keyof FormSimulasi, nilai: string) => setForm({ ...form, [kolom]: nilai }),
    jalankan: () => {
      const hasil = bangunPermintaanSimulasi(form);
      setGalat("galat" in hasil ? hasil.galat : null);
      if ("input" in hasil) jalan.mutate(hasil.input);
    },
    reset: () => {
      setForm(FORM_SIMULASI_KOSONG);
      setGalat(null);
      jalan.reset();
    },
    galat: galat ?? jalan.error?.message ?? null,
    sibuk: jalan.isPending,
    hasil: jalan.data,
  };
}
