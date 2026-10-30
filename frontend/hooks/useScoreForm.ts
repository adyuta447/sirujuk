"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { LEVEL_DARI_KEPUTUSAN } from "../lib/alasan-skor";
import { bacaInputSkor } from "../lib/skor-form";
import { useScoreReferral } from "./useScoreReferral";

export function useScoreForm() {
  const { mutate, data, error, isPending, reset } = useScoreReferral();
  const [kosong, setKosong] = useState(false);

  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = bacaInputSkor(new FormData(e.currentTarget));
    setKosong(input === null);
    if (input) mutate(input);
  };

  const level = data?.status === "SCORED" ? LEVEL_DARI_KEPUTUSAN[data.decision] : null;

  return { kirim, kosong, data, error, isPending, reset, level };
}
