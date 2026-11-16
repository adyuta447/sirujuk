"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { getActivity } from "../services/activity.service";
import { useAktivitasDilihat } from "../store/useAktivitasDilihat";
import type { HasilAktivitas } from "../types/activity";
import { useDebounced } from "./useDebounced";

export type AktivitasState = ReturnType<typeof useAktivitas>;

const UKURAN_HALAMAN = 25;

/** Log aktivitas dari backend dengan filter dan "muat lebih banyak" (kursor dari server). Membukanya menandai terbaca. */
export function useAktivitas() {
  const [outcome, setOutcome] = useState<HasilAktivitas | "">("");
  const [resource, setResource] = useState("");
  const [noRujukan, setNoRujukan] = useState("");
  const referralId = useDebounced(noRujukan.trim().toLowerCase());
  const filter = { outcome: outcome || undefined, resource: resource || undefined, referral_id: referralId || undefined };

  const q = useInfiniteQuery({
    queryKey: ["activity", "log", filter],
    queryFn: ({ pageParam }) => getActivity({ ...filter, cursor: pageParam, limit: UKURAN_HALAMAN }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (terakhir) => terakhir.next || undefined,
    staleTime: 15 * 1000,
    retry: false,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  // Daftar tanpa filter yang terbuka berarti yang terbaru sudah dilihat.
  const terbaru = items[0]?.at;
  const tandai = useAktivitasDilihat((s) => s.tandai);
  const tanpaFilter = !outcome && !resource && !referralId;
  useEffect(() => {
    if (tanpaFilter && terbaru) tandai(terbaru);
  }, [tanpaFilter, terbaru, tandai]);

  return {
    items,
    outcome,
    setOutcome,
    resource,
    setResource,
    noRujukan,
    setNoRujukan,
    isLoading: q.isLoading,
    isError: q.isError,
    // Backend lama belum punya endpoint-nya (404), atau penyimpanan lognya sedang tidak tersedia (503).
    belumTersedia: q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 503),
    adaLanjut: !!q.hasNextPage,
    memuatLagi: q.isFetchingNextPage,
    muatLagi: () => void q.fetchNextPage(),
    ulangi: () => void q.refetch(),
  };
}
