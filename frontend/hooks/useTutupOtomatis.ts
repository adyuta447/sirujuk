"use client";

import { useEffect } from "react";

/** Memanggil `tutup` setelah `ms` selama `aktif`. Dibatalkan bila `aktif` berubah sebelum waktunya. */
export function useTutupOtomatis(aktif: boolean, ms: number, tutup: () => void) {
  useEffect(() => {
    if (!aktif) return;
    const t = setTimeout(tutup, ms);
    return () => clearTimeout(t);
  }, [aktif, ms, tutup]);
}
