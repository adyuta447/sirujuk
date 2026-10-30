"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** Smooth scroll seluruh halaman selama `aktif` (jangkar #tetap jalan). */
export function useSmoothScroll(aktif: boolean) {
  useEffect(() => {
    if (!aktif) return;
    const lenis = new Lenis({ lerp: 0.08, anchors: true });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [aktif]);
}
