"use client";

import { useMutation } from "@tanstack/react-query";
import { scoreReferral } from "../services/referral.service";

export function useScoreReferral() {
  return useMutation({ mutationFn: scoreReferral });
}
