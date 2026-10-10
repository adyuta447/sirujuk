"use client";

import { useQuery } from "@tanstack/react-query";
import type { Peran } from "../lib/akses";

export type SesiTampilan = { nama: string; role: Peran };

// Hanya untuk tampilan (nama, menu). Penegakan akses ada di proxy.ts dan route handler.
export function useSession() {
  return useQuery({
    queryKey: ["sesi"],
    queryFn: async (): Promise<SesiTampilan> => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Belum masuk");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
