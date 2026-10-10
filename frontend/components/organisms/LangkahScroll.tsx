"use client";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { Illustration } from "../atoms/Illustration";
import type { IllustrationName } from "../atoms/Illustration";

const LANGKAH: { judul: string; isi: string; art: IllustrationName }[] = [
  { judul: "Cek data fasilitas", isi: "Alasan rujukan dicocokkan dengan data alat dan tenaga medis di SISRUTE. Kalau datanya sudah lama tidak diperbarui, bobotnya diturunkan.", art: "dinkes-terang" },
  { judul: "Lihat pola dokter", isi: "Rasio rujukan ringan dan konsentrasi rumah sakit tujuan dibandingkan dengan dokter sejenis di wilayah yang sama.", art: "analitik-terang" },
  { judul: "Baca narasi klinis", isi: "Catatan dokter dicek: terlalu umum atau sesuai panduan praktik klinis untuk diagnosis itu.", art: "klarifikasi-terang" },
  { judul: "Hasilnya satu skor", isi: "Skor 0 sampai 100 menentukan rujukan lolos, ditinjau verifikator, atau ditahan untuk audit medis.", art: "selesai-terang" },
];

// Geometri garis penghubung: ular longgar yang meliuk di antara kolom
// teks dan ilustrasi (pola dari WorkflowSection referensi, tema SIRUJUK).
const ALUR =
  "M 500 0 C 590 200, 410 400, 500 600 C 590 800, 410 1000, 500 1200";

// Stepper sinkron scroll: langkah yang sedang dibaca menyala penuh,
// yang lain meredup. Berlaku dua arah (turun maupun naik).
// Tanpa framer-motion: IntersectionObserver + transisi CSS 500ms.
// Garis lengkung digambar via stroke-dashoffset dari progress scroll.
export const LangkahScroll = () => {
  const root = useRef<HTMLElement>(null);
  const garisRef = useRef<SVGPathElement>(null);
  const [anim, setAnim] = useState(false);
  const [aktif, setAktif] = useState(0);
  const [maju, setMaju] = useState(0);
  const [panjang, setPanjang] = useState(1);

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
  }, [anim]);

  // Garis penghubung terisi mengikuti posisi scroll (scrub, dua arah).
  useEffect(() => {
    if (!anim || !root.current) return;
    let raf = 0;
    const ukur = () => {
      raf = 0;
      const daftar = root.current?.querySelector("[data-daftar]");
      if (!daftar) return;
      const r = (daftar as HTMLElement).getBoundingClientRect();
      const p = (window.innerHeight / 2 - r.top) / r.height;
      setMaju(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(ukur);
    };
    ukur();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [anim]);

  // Panjang garis diukur dari DOM (satuan viewBox, kebal terhadap scaling),
  // lalu progress memakai stroke-dashoffset biasa yang pasti tampil.
  useEffect(() => {
    const ukurPanjang = () => {
      try {
        if (garisRef.current) setPanjang(garisRef.current.getTotalLength());
      } catch {
        /* abaikan: biarkan fallback */
      }
    };
    ukurPanjang();
    window.addEventListener("resize", ukurPanjang);
    return () => window.removeEventListener("resize", ukurPanjang);
  }, []);
  // Langkah aktif = yang memotong pita tengah viewport. Reversibel.
  useEffect(() => {
    if (!anim || !root.current) return;
    const items = Array.from(root.current.querySelectorAll("[data-langkah]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setAktif(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [anim]);

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
        <ol data-daftar className={anim ? "relative mt-8 md:mt-12" : "mt-10 space-y-16"}>
          {anim && (
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 1200"
              preserveAspectRatio="none"
            >
              <path
                d={ALUR}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
                strokeDasharray="8 8"
                vectorEffect="non-scaling-stroke"
              />
              <path
                ref={garisRef}
                d={ALUR}
                fill="none"
                stroke="#7DB4F5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={panjang}
                strokeDashoffset={panjang * (1 - maju)}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {LANGKAH.map(({ judul, isi, art }, i) => {
            const nyala = !anim || aktif === i;
            const lewat = !anim || i < aktif;
            const kiri = i % 2 === 0;
            return (
              <li
                key={judul}
                data-langkah
                data-i={i}
                className={anim ? "relative min-h-[72vh] flex items-center py-10" : ""}
              >
                {anim && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ring-4 ring-[#1E3A5F] transition-colors duration-300 z-10"
                    style={{
                      borderColor: "#FFFFFF",
                      backgroundColor: nyala ? "#0E7C6B" : lewat ? "#FFFFFF" : "#1E3A5F",
                    }}
                  />
                )}
                <div className={`w-full grid lg:grid-cols-2 gap-10 lg:gap-24 items-center transition-opacity duration-500 motion-reduce:transition-none ${nyala ? "opacity-100" : "opacity-40"}`}>
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
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
