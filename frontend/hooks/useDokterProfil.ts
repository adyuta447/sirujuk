"use client";

import { slugDokter } from "../lib/sirujuk-data";
import { useReferrals } from "./useReferral";
import { useDokterStats } from "./useStats";

export function useDokterProfil(slug?: string) {
  const { data: referrals = [] } = useReferrals();
  const { data: daftarDokter = [] } = useDokterStats();
  const dokter = daftarDokter.find((d) => slugDokter(d.nama) === slug);
  const kasus = dokter ? referrals.filter((c) => c.dokter === dokter.nama) : [];
  const prioritas = kasus.find((c) => c.risk !== "rendah" && c.status !== "selesai");

  return { daftarDokter, dokter, kasus, prioritas };
}
