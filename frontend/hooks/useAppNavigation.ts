"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PATHS } from "../lib/navigation";
import { slugDokter } from "../lib/sirujuk-data";
import type { RujukanCase, View } from "../lib/sirujuk-data";

export type AppNavigation = ReturnType<typeof useAppNavigation>;

export function useAppNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return {
    go: (v: View) => router.push(PATHS[v] ?? "/dashboard"),
    keBeranda: () => router.push("/"),
    keLogin: () => router.push("/login"),
    keDaftar: () => router.push("/daftar"),
    keAntrean: () => router.push("/queue"),
    lihatDetail: (c: RujukanCase) => router.push(`/referral/${c.id}`),
    mulaiAudit: (c: RujukanCase) => router.push(`/audit/${c.id}`),
    keKlarifikasi: (c: RujukanCase) => router.push(`/klarifikasi/${c.id}`),
    keDokter: (nama: string) => router.push(nama ? `/dokter/${slugDokter(nama)}` : "/dokter"),
    keluar: async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
  };
}
