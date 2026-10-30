"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AUDIT_CHECKLIST } from "../lib/sirujuk-data";
import type { Keputusan, RujukanCase } from "../lib/sirujuk-data";
import { submitAudit } from "../services/referral.service";

export type AuditFormState = ReturnType<typeof useAuditForm>;

const WAKTU_TUTUP_MS = 2200;

export function useAuditForm(kasus: RujukanCase, onDone: () => void) {
  const queryClient = useQueryClient();
  const [keputusan, setKeputusan] = useState<Keputusan | null>(null);
  const [catatan, setCatatan] = useState("");
  const [checks, setChecks] = useState<boolean[]>(() => AUDIT_CHECKLIST.map(() => false));
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // Setelah tersimpan kembali ke antrean otomatis, kecuali masih perlu kirim klarifikasi.
  useEffect(() => {
    if (!submitted || keputusan === "perlu-klarifikasi") return;
    const timeout = window.setTimeout(onDone, WAKTU_TUTUP_MS);
    return () => window.clearTimeout(timeout);
  }, [keputusan, onDone, submitted]);

  const toggleCheck = (index: number) =>
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));

  const canSubmit = keputusan !== null && catatan.trim().length > 0;

  const submit = async () => {
    if (keputusan === null || !canSubmit || menyimpan) return;
    setSaveError(null);
    setMenyimpan(true);
    try {
      // Layar sukses hanya setelah server benar-benar menyimpan.
      await submitAudit(kasus.id, keputusan, catatan.trim());
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      setSubmitted(true);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setMenyimpan(false);
    }
  };

  return {
    keputusan,
    setKeputusan,
    catatan,
    setCatatan,
    checks,
    toggleCheck,
    submitted,
    saveError,
    menyimpan,
    canSubmit,
    submit,
  };
}
