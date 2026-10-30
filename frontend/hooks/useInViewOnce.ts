"use client";

import { useEffect, useRef, useState } from "react";

/** Mengembalikan `ref` dan `terlihat`: berubah true sekali saat elemen masuk viewport, lalu berhenti mengamati. */
export function useInViewOnce<T extends Element>(threshold: number) {
  const ref = useRef<T>(null);
  const [terlihat, setTerlihat] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTerlihat(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, terlihat };
}
