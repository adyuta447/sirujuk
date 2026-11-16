"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getActivity } from "../services/activity.service";
import { useAktivitasDilihat } from "../store/useAktivitasDilihat";
import { useSession } from "./useSession";

const JEDA_MS = 60 * 1000;

/**
 * Jumlah entri baru yang ditolak atau gagal sejak terakhir dilihat, untuk lonceng. Yang dihitung hanya yang perlu
 * perhatian: backend tidak mengirim identitas akun ke browser, jadi aksi sendiri yang berhasil tidak bisa dipisahkan
 * dari aksi orang lain, dan menghitung semuanya akan membuat lonceng selalu menyala.
 */
export function useAktivitasBelumDibaca(): number {
  const { data: sesi } = useSession();
  const dilihat = useAktivitasDilihat((s) => s.dilihat);
  const tandai = useAktivitasDilihat((s) => s.tandai);
  const { data } = useQuery({
    queryKey: ["activity", "terbaru"],
    queryFn: () => getActivity({ limit: 20 }),
    enabled: !!sesi,
    retry: false,
    staleTime: JEDA_MS / 2,
    // Berhenti bertanya bila backend belum punya endpoint-nya.
    refetchInterval: (q) => (q.state.status === "error" ? false : JEDA_MS),
  });

  // Dasar pertama: yang sudah ada saat aplikasi dibuka tidak dihitung baru.
  useEffect(() => {
    if (data && dilihat === null) tandai(data.items[0]?.at ?? "");
  }, [data, dilihat, tandai]);

  if (!data || dilihat === null) return 0;
  return data.items.filter((e) => e.outcome !== "ok" && e.at > dilihat).length;
}
