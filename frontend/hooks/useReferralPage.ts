"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { getReferralPage } from "../services/referral-page.service";
import type { FilterRujukan } from "../types/referral-page";

/** Daftar berhalaman dari server. Kursor hanya maju/mundur lewat tumpukan; filter berubah → kembali ke halaman 1. */
export function useReferralPage(filter: FilterRujukan) {
  const key = JSON.stringify(filter);
  const [state, setState] = useState<{ key: string; tumpukan: (string | undefined)[] }>({ key, tumpukan: [undefined] });
  const tumpukan = state.key === key ? state.tumpukan : [undefined];
  const scrollRef = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["referrals", "halaman", key, tumpukan[tumpukan.length - 1]],
    queryFn: () => getReferralPage({ ...filter, cursor: tumpukan[tumpukan.length - 1] }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const next = query.data?.next ?? null;
  const pindah = (t: (string | undefined)[]) => {
    setState({ key, tumpukan: t });
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return {
    scrollRef,
    halaman: tumpukan.length,
    data: query.data,
    tampak: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    adaSebelum: tumpukan.length > 1,
    adaLanjut: next !== null,
    sebelum: () => pindah(tumpukan.slice(0, -1)),
    berikut: () => next && pindah([...tumpukan, next]),
  };
}
