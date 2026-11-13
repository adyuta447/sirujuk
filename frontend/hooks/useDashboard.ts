"use client";

import { ringkasBeranda } from "../lib/ringkasan-beranda";
import { useReferrals } from "./useReferral";
import { useSession } from "./useSession";

export function useDashboard() {
  const { data: referrals = [], isError, isLoading } = useReferrals();
  const { data: sesi } = useSession();

  return { referrals, isError, isLoading, nama: sesi?.nama, ringkasan: ringkasBeranda(referrals) };
}
