"use client";

import { useEffect } from "react";

// Latar halaman gelap selama komponen terpasang, supaya area di bawah footer (overscroll) tidak terlihat putih.
export function useDarkRootBackground(warna = "#0E1B2A") {
  useEffect(() => {
    const el = document.documentElement;
    const lama = el.style.backgroundColor;
    el.style.backgroundColor = warna;
    return () => {
      el.style.backgroundColor = lama;
    };
  }, [warna]);
}
