"use client";

import { useQuery } from "@tanstack/react-query";
import { getReferrals } from "../services/referral.service";

export function useReferrals() {
  return useQuery({
    queryKey: ["referrals"],
    queryFn: getReferrals,
    staleTime: 5 * 60 * 1000,
  });
}
