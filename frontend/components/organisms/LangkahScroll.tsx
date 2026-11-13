"use client";

import { useMotionAllowed } from "../../hooks/useMotionAllowed";
import { useScrollLine } from "../../hooks/useScrollLine";
import { useSmoothScroll } from "../../hooks/useSmoothScroll";
import { LANGKAH } from "../../data/langkah";
import { FlowLine } from "./langkah/FlowLine";
import { StepItem } from "./langkah/StepItem";

// Progress garis mengikuti scroll; langkah masuk satu per satu. Isi dan tema khusus SIRUJUK.
export function LangkahScroll() {
  const animated = useMotionAllowed();
  const { daftarRef, halus } = useScrollLine();
  useSmoothScroll(animated);

  return (
    <section id="cara-kerja" aria-labelledby="judul-cara-kerja" className="bg-[#1E3A5F] text-white scroll-mt-20">
      <div className="w-full max-w-[75rem] mx-auto px-5 md:px-10 py-20 md:py-28">
        <h2 id="judul-cara-kerja" className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
          Empat pemeriksaan, satu skor.
        </h2>
        <p className="mt-4 text-lg text-[#D5DFEC] max-w-2xl">
          Setiap rujukan melewati empat pemeriksaan berurutan sebelum menjadi satu skor.
        </p>
        <div className="relative mt-8 md:mt-12">
          {animated && <FlowLine progress={halus} />}
          <ol ref={daftarRef} className={animated ? "" : "mt-10 space-y-16"}>
            {LANGKAH.map((step, i) => (
              <StepItem key={step.judul} step={step} index={i} animated={animated} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
