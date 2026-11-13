"use client";

import { useState } from "react";

/** Akordeon satu-buka: membuka satu id menutup yang lain; klik id terbuka menutupnya. */
export function useAccordion<T extends string | number>(awal: T | null = null) {
  const [open, setOpen] = useState<T | null>(awal);

  return {
    open,
    toggle: (id: T) => setOpen((sekarang) => (sekarang === id ? null : id)),
  };
}
