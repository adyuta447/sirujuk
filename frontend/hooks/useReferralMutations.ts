"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { denganProses } from "../lib/dengan-proses";
import {
  archiveReferral,
  rescoreReferral,
  submitClarification,
  updateReferral,
} from "../services/referral.service";
import type { ReferralEdit } from "../types/referral";

/** Setiap perubahan membuat daftar, detail, dan statistik diambil ulang dari backend. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: ["referrals"] }), queryClient.invalidateQueries({ queryKey: ["stats"] })]);
}

export function useReferralMutations() {
  const refresh = useRefresh();
  const options = { onSuccess: refresh };
  return {
    update: useMutation({ mutationFn: ({ id, edit }: { id: string; edit: ReferralEdit }) => denganProses("ubah", () => updateReferral(id, edit), id.toUpperCase()), ...options }),
    rescore: useMutation({ mutationFn: (id: string) => denganProses("hitung-ulang", () => rescoreReferral(id), id.toUpperCase()), ...options }),
    archive: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => denganProses("arsip", () => archiveReferral(id, note), id.toUpperCase()), ...options }),
    clarify: useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => denganProses("klarifikasi", () => submitClarification(id, text), id.toUpperCase()), ...options }),
  };
}
