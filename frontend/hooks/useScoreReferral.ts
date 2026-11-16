"use client";

import { useMutation } from "@tanstack/react-query";
import { denganProses } from "../lib/dengan-proses";
import { scoreReferral } from "../services/referral.service";

export function useScoreReferral() {
  return useMutation({ mutationFn: (input: Parameters<typeof scoreReferral>[0]) => denganProses("skor", () => scoreReferral(input), input.referral_no.toUpperCase()) });
}
