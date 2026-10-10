"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Lenis from "lenis";
import { Illustration } from "../atoms/Illustration";
import type { IllustrationName } from "../atoms/Illustration";

const LANGKAH: { judul: string; isi: string; art: IllustrationName }[] = [
  { judul: "Cek data fasilitas", isi: "Alasan rujukan dicocokkan dengan data alat dan tenaga medis di SISRUTE. Kalau datanya sudah lama tidak diperbarui, bobotnya diturunkan.", art: "dinkes-terang" },
  { judul: "Lihat pola dokter", isi: "Rasio rujukan ringan dan konsentrasi rumah sakit tujuan dibandingkan dengan dokter sejenis di wilayah yang sama.", art: "analitik-terang" },
  { judul: "Baca narasi klinis", isi: "Catatan dokter dicek: terlalu umum atau sesuai panduan praktik klinis untuk diagnosis itu.", art: "klarifikasi-terang" },
  { judul: "Hasilnya satu skor", isi: "Skor 0 sampai 100 menentukan rujukan lolos, ditinjau verifikator, atau ditahan untuk audit medis.", art: "selesai-terang" },
];

// Geometri garis penghubung: ular longgar di antara kolom teks dan ilustrasi.
const ALUR =
  "M 500 0 C 640 200, 360 400, 500 600 C 640 800, 360 1000, 500 1200";

// Mekanik scroll persis dari anchor (WorkflowSection): progress garis via
// useScroll scrub + useSpring — framer-motion menulis ke DOM langsung tanpa
// re-render React tiap frame, jadi mulus dua arah; langkah masuk via
// whileInView spring sekali tampil. Isi dan tema tetap SIRUJUK.
export const LangkahScroll = () => {
  const root = useRef<HTMLElement>(null);
  const daftarRef = useRef<HTMLOListElement>(null);
  const [anim, setAnim] = useState(false);
  const { scrollYProgress } = useScroll({
    target: daftarRef,
    offset: ["start center", "end center"],
  });
  const halus = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    setAnim(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Smooth scroll seluruh halaman (jangkar #tetap jalan).
  useEffect(() => {
    if (!anim) return;
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
  }, [anim ]);

  const Item = anim ? motion.li : "li";

  return (
    <section
      ref={root}
      id="cara-kerja"
      aria-labelledby="judul-cara-kerja"
      className="bg-[#1E3A5F] text-white scroll-mt-20"
    >
      <div className="w-full max-w-[75rem] mx-auto px-5 md:px-10 py-20 md:py-28">
        <h2 id="judul-cara-kerja" className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
          Empat pemeriksaan, satu skor.
        </h2>
        <p className="mt-4 text-lg text-[#D5DFEC] max-w-2xl">
          Setiap rujukan melewati empat pemeriksaan berurutan sebelum menjadi satu skor.
        </p>

        <div className="relative mt-8 md:mt-12">
          {anim && (
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full hidden md:block pointer-events-none"
              viewBox="0 0 1000 1200"
              preserveAspectRatio="none"
            >
              <motion.path
                d={ALUR}
                fill="none"
                stroke="#7DB4F5"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ pathLength: halus }}
              />
            </svg>
          )}
          <ol ref={daftarRef} className={anim ? "" : "mt-10 space-y-16"}>
            {LANGKAH.map(({ judul, isi, art }, i) => {
              const kiri = i % 2 === 0;
              return (
                <Item
                  key={judul}
                  {...(anim
                    ? {
                        initial: { opacity: 0, y: 40 },
                        whileInView: { opacity: 1, y: 0 },
                        viewport: { once: true, margin: "-100px" },
                        transition: { type: "spring", stiffness: 80, damping: 20, delay: 0.1 },
                      }
                    : {})}
                  className={anim ? "relative min-h-[72vh] flex items-center py-10" : ""}
                >
                  <div className="w-full grid lg:grid-cols-2 gap-10 lg:gap-32 items-center">
                    <div className={`relative flex flex-col justify-center ${kiri ? "order-2 lg:order-1" : "order-2 lg:order-2"}`}>
                      <span
                        aria-hidden="true"
                        className="absolute -top-14 md:-top-20 -left-2 font-black tracking-tighter leading-none select-none text-[6rem] md:text-[9rem] text-white/10"
                      >
                        {i + 1}
                      </span>
                      <div className="relative">
                        <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-[#7DB4F5]">
                          Langkah {i + 1}
                        </span>
                        <h3 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
                          {judul}
                        </h3>
                        <p className="mt-4 text-lg md:text-xl leading-relaxed text-[#D5DFEC] max-w-xl">
                          {isi}
                        </p>
                      </div>
                    </div>
                    <div className={`relative h-52 md:h-72 lg:h-[22rem] ${kiri ? "order-1 lg:order-2" : "order-1 lg:order-1"}`}>
                      <Illustration name={art} className="absolute inset-0 w-full h-full" />
                    </div>
                  </div>
                </Item>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
