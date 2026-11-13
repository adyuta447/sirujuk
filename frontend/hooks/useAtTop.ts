"use client";

import { useEffect, useState } from "react";

/** True selama halaman masih di paling atas (belum di-scroll lebih dari `batas` px). */
export function useAtTop(batas = 24) {
  const [atas, setAtas] = useState(true);

  useEffect(() => {
    const onScroll = () => setAtas(window.scrollY < batas);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [batas]);

  return atas;
}
