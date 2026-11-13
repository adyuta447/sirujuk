"use client";
import { useEffect, useRef, useState } from "react";

// Count-up ala bank: 0 ke target dengan easeOutExpo (cepat di awal,
// mendarat tepat). Jalan saat `mulai` true; reduced-motion langsung final.
interface CountUpProps {
  target: number;
  suffix?: string;
  mulai: boolean;
  delay?: number;
  durasi?: number;
}

export function CountUp({ target, suffix = "", mulai, delay = 0, durasi = 1400 }: CountUpProps) {
  const [nilai, setNilai] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!mulai) return;
    if (
      target === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setNilai(target);
      return;
    }
    const t0 = performance.now() + delay;
    const putar = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / durasi));
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setNilai(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(putar);
    };
    raf.current = requestAnimationFrame(putar);
    return () => cancelAnimationFrame(raf.current);
  }, [mulai, target, delay, durasi]);

  return (
    <>
      {nilai.toLocaleString("id-ID")}
      {suffix}
    </>
  );
}
