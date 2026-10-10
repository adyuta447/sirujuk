"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Illustration } from "../atoms/Illustration";
import type { IllustrationName } from "../atoms/Illustration";

const LANGKAH: { judul: string; isi: string; art: IllustrationName }[] = [
  { judul: "Cek data fasilitas", isi: "Alasan rujukan dicocokkan dengan data alat dan tenaga medis di SISRUTE. Kalau datanya sudah lama tidak diperbarui, bobotnya diturunkan.", art: "dinkes-terang" },
  { judul: "Lihat pola dokter", isi: "Rasio rujukan ringan dan konsentrasi rumah sakit tujuan dibandingkan dengan dokter sejenis di wilayah yang sama.", art: "analitik-terang" },
  { judul: "Baca narasi klinis", isi: "Catatan dokter dicek: terlalu umum atau sesuai panduan praktik klinis untuk diagnosis itu.", art: "klarifikasi-terang" },
  { judul: "Hasilnya satu skor", isi: "Skor 0 sampai 100 menentukan rujukan lolos, ditinjau verifikator, atau ditahan untuk audit medis.", art: "selesai-terang" },
];

// Satu layar penuh yang di-pin; tiap scroll menggeser ke langkah berikutnya.
export const LangkahScroll = () => {
  const root = useRef<HTMLElement>(null);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    setAnim(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!anim || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.ticker.lagSmoothing(0);
    // Smooth scroll untuk seluruh halaman, disinkronkan dengan ScrollTrigger.
    const lenis = new Lenis({ lerp: 0.08, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    const ctx = gsap.context(() => {
      const track = root.current!.querySelector("[data-track]");
      const count = LANGKAH.length;
      const bars = gsap.utils.toArray<HTMLElement>("[data-bar]");
      gsap.set(bars, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(bars[0], { scaleX: 1 });

      const tl = gsap.timeline({
        defaults: { ease: "sine.inOut", force3D: true },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: `+=${count * 100}%`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          pin: true,
        },
      });
      tl.to({}, { duration: 0.6 });
      for (let i = 1; i < count; i++) {
        tl.to(track, { xPercent: -100 * i, duration: 1 })
          .to(bars[i], { scaleX: 1, duration: 1 }, "<")
          .to({}, { duration: 0.6 });
      }
    }, root);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      ctx.revert();
    };
  }, [anim]);

  return (
    <section
      ref={root}
      id="cara-kerja"
      aria-labelledby="judul-cara-kerja"
      className={`bg-[#1E3A5F] text-white ${anim ? "h-screen overflow-hidden" : "py-20"}`}
    >
      <div className={anim ? "h-full flex flex-col" : ""}>
        <div className="w-full max-w-[75rem] mx-auto px-5 md:px-10">
          <div className={anim ? "pt-24 md:pt-28" : ""}>
            <h2 id="judul-cara-kerja" className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">
              Empat pemeriksaan, satu skor.
            </h2>
            <div aria-hidden="true" className={`${anim ? "grid" : "hidden"} grid-cols-4 gap-2 mt-5`}>
              {LANGKAH.map((l) => (
                <div key={l.judul} className="h-1.5 rounded-4xl bg-[#3A5880] overflow-hidden">
                  <div data-bar className="h-full w-full bg-white" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={anim ? "flex-1 min-h-0" : ""}>
          <ol data-track className={anim ? "flex h-full will-change-transform" : "mt-10 space-y-16"}>
            {LANGKAH.map(({ judul, isi, art }, i) => (
              <li key={judul} className={anim ? "w-full h-full shrink-0 flex items-center" : ""}>
                <div className="w-full max-w-[75rem] mx-auto px-5 md:px-10 grid lg:grid-cols-[1.25fr_1fr] gap-6 lg:gap-12 items-stretch lg:min-h-[min(26rem,52vh)]">
                  <div className="flex flex-col justify-center order-2 lg:order-1">
                    <div className="flex items-center gap-3 md:gap-5 whitespace-nowrap font-extrabold tracking-tighter leading-[1.05] text-[7vw] md:text-[min(6vw,4.5rem)] lg:text-[min(4.2vw,3.4rem)]">
                      <span className="text-[#7DB4F5]">{i + 1}</span>
                      <h3>{judul}</h3>
                    </div>
                    <p className="text-lg md:text-2xl lg:text-3xl leading-snug text-[#D5DFEC] mt-4 lg:mt-6">{isi}</p>
                  </div>
                  <div className="relative h-44 md:h-64 lg:h-auto order-1 lg:order-2">
                    <Illustration name={art} className="absolute inset-0 w-full h-full" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
