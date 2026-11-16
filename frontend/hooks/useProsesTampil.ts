"use client";

import { useEffect, useRef, useState } from "react";
import { useProsesStore } from "../store/useProsesStore";
import type { KunciProses } from "../types/proses";

const TUNDA_MS = 250; // aksi yang selesai lebih cepat dari ini tidak memunculkan pop-up sama sekali
const MINIMAL_MS = 600; // sekali muncul, bertahan cukup lama agar tidak berkedip

/** Proses yang perlu ditampilkan sekarang, atau null. Menunda munculnya dan menahan hilangnya. */
export function useProsesTampil(): KunciProses | null {
  const kunci = useProsesStore((s) => s.antrean[0] ?? null);
  const [tampil, setTampil] = useState<KunciProses | null>(null);
  const sejak = useRef(0);

  useEffect(() => {
    if (kunci) {
      if (tampil) {
        setTampil(kunci);
        return;
      }
      const t = setTimeout(() => {
        sejak.current = Date.now();
        setTampil(kunci);
      }, TUNDA_MS);
      return () => clearTimeout(t);
    }
    if (!tampil) return;
    const t = setTimeout(() => setTampil(null), Math.max(0, MINIMAL_MS - (Date.now() - sejak.current)));
    return () => clearTimeout(t);
  }, [kunci, tampil]);

  return tampil;
}
