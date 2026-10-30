"use client";

import { useState } from "react";
import { useReferralMutations } from "./useReferralMutations";

export type ClarificationFormState = ReturnType<typeof useClarificationForm>;

export function useClarificationForm(kasusId: string) {
  const [jawaban, setJawaban] = useState("");
  const [terkirim, setTerkirim] = useState(false);
  const { clarify } = useReferralMutations();

  return {
    jawaban,
    setJawaban,
    terkirim,
    kirim: () => clarify.mutate({ id: kasusId, text: jawaban.trim() }, { onSuccess: () => setTerkirim(true) }),
    bisaKirim: jawaban.trim().length > 0 && !clarify.isPending,
    gagal: clarify.isError,
    pesanGagal: clarify.error?.message,
  };
}
