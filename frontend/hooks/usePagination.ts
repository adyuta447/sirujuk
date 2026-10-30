"use client";

import { useEffect, useRef, useState } from "react";
import { PAGE_SIZE } from "../lib/constants";

/** Pagination untuk daftar di area scroll; `resetKey` berubah → kembali ke halaman 1. */
export function usePagination<T>(items: T[], resetKey: string) {
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const halaman = Math.min(page, totalPages);
  const tampak = items.slice((halaman - 1) * PAGE_SIZE, halaman * PAGE_SIZE);

  const gantiHalaman = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return { scrollRef, halaman, totalPages, tampak, gantiHalaman, totalItems: items.length };
}
