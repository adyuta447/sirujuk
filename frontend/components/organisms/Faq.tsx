"use client";

import { useFaq } from "../../hooks/useFaq";
import { TANYA } from "../../data/faq";
import { FaqItem } from "./faq/FaqItem";

// Akordeon satu-buka: animasi grid-rows 300ms, masuk staggered saat scroll,
// semuanya dimatikan otomatis bila pengguna memilih reduced motion.
export function Faq() {
  const faq = useFaq();

  return (
    <section id="tanya-jawab" className="bg-[#F4F6F9] scroll-mt-20">
      <div ref={faq.ref} className="max-w-[56rem] mx-auto px-5 md:px-10 py-20">
        <h2 className="mt-2 text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05]">Tanya jawab.</h2>
        <p className="mt-4 text-lg text-[#56657A] max-w-2xl">
          Jawaban singkat atas hal yang paling sering ditanyakan dokter, verifikator, dan dinas kesehatan.
        </p>
        <div className="mt-10 space-y-3">
          {TANYA.map((entry, i) => (
            <FaqItem
              key={entry.tanya}
              entry={entry}
              index={i}
              open={faq.open === i}
              tampil={faq.tampil}
              rapi={faq.rapi}
              onToggle={() => faq.toggle(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
