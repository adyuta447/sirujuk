"use client";

import { useEffect, useState } from "react";

/** False sampai terbukti pengguna tidak memilih reduced motion (aman untuk SSR). */
export function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return allowed;
}
