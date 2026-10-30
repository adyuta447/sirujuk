"use client";

import { useEffect, useState } from "react";
import { useAccordion } from "./useAccordion";
import { useInViewOnce } from "./useInViewOnce";

/** Akordeon FAQ + animasi masuk saat scroll. `rapi` true setelah stagger selesai, supaya buka-tutup tidak tertunda. */
export function useFaq() {
  const { open, toggle } = useAccordion<number>(0);
  const { ref, terlihat } = useInViewOnce<HTMLDivElement>(0.1);
  const [rapi, setRapi] = useState(false);

  useEffect(() => {
    if (!terlihat) return;
    const t = window.setTimeout(() => setRapi(true), 700);
    return () => window.clearTimeout(t);
  }, [terlihat]);

  return { ref, open, toggle, tampil: terlihat, rapi };
}
