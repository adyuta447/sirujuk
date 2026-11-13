"use client";

import { useState } from "react";
import { hanyaTkmkb } from "../lib/akses";
import type { RujukanCase } from "../lib/sirujuk-data";
import { validateReferral } from "../lib/validate";
import { useReferralMutations } from "./useReferralMutations";
import { useSession } from "./useSession";

export type ActionMode = "idle" | "edit" | "arsip";
export type ReferralActionsState = ReturnType<typeof useReferralActions>;

/** Hitung ulang, ubah, dan arsipkan rujukan. Skor tetap dihitung ML di backend; arsip hanya TKMKB. */
export function useReferralActions(kasus: RujukanCase, onArchived: () => void) {
  const { data: sesi } = useSession();
  const { update, rescore, archive } = useReferralMutations();
  const [mode, setMode] = useState<ActionMode>("idle");
  const [diagnosis, setDiagnosis] = useState(kasus.diagnosa);
  const [alasan, setAlasan] = useState(kasus.alasanRujukan ?? "");
  const [narasi, setNarasi] = useState(kasus.narasi ?? "");
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const simpan = () => {
    const edit = {
      doctor_id: kasus.dokter,
      origin_facility_id: kasus.fasalOrigin,
      destination_facility_id: kasus.fasalTujuan,
      diagnosis_code: diagnosis.trim(),
      reason: alasan.trim(),
      clinical_narrative: narasi.trim(),
    };
    const salah = validateReferral({ referral_no: kasus.id, ...edit });
    setGalat(salah);
    if (!salah) update.mutate({ id: kasus.id, edit }, { onSuccess: () => setMode("idle") });
  };

  const arsipkan = () => {
    if (!catatan.trim()) return setGalat("Alasan pengarsipan wajib diisi.");
    setGalat(null);
    archive.mutate({ id: kasus.id, note: catatan.trim() }, { onSuccess: onArchived });
  };

  return {
    mode,
    toggleMode: (target: Exclude<ActionMode, "idle">) => setMode(mode === target ? "idle" : target),
    edit: { diagnosis, setDiagnosis, alasan, setAlasan, narasi, setNarasi },
    catatan,
    setCatatan,
    galat,
    simpan,
    arsipkan,
    rescore: () => rescore.mutate(kasus.id),
    bisaArsip: sesi?.role === "tkmkb",
    bisaUbah: !hanyaTkmkb(kasus.risk, sesi?.role),
    pesanGagal: (update.error ?? rescore.error ?? archive.error)?.message,
    sibuk: update.isPending || rescore.isPending || archive.isPending,
    gagal: update.isError || rescore.isError || archive.isError,
    berhasil: update.isSuccess || rescore.isSuccess,
  };
}
