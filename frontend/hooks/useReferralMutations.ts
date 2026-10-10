"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
    update: useMutation({ mutationFn: ({ id, edit }: { id: string; edit: ReferralEdit }) => updateReferral(id, edit), ...options }),
    rescore: useMutation({ mutationFn: (id: string) => rescoreReferral(id), ...options }),
    archive: useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => archiveReferral(id, note), ...options }),
    clarify: useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => submitClarification(id, text), ...options }),
  };
}
