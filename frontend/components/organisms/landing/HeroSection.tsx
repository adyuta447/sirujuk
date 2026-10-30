import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LightButton } from "../../atoms/LightButton";

interface HeroSectionProps {
  onEnter: () => void;
}

export function HeroSection({ onEnter }: HeroSectionProps) {
  return (
    <section className="relative flex flex-col bg-[#1E3A5F] text-white lg:min-h-screen">
      <div className="relative z-10 w-full max-w-[75rem] mx-auto px-5 md:px-10 pt-28 pb-10 lg:pt-36 order-1">
        <p className="text-sm font-bold tracking-widest uppercase lg:[text-shadow:0_1px_10px_#0E1B2A]">
          SIRUJUK
        </p>
        <h1 className="mt-3 max-w-3xl text-5xl md:text-7xl xl:text-8xl font-extrabold tracking-tighter leading-[1.02] lg:[text-shadow:0_2px_24px_#0E1B2A,0_0_3px_#0E1B2A]">
          Menjaga Rujukan Tetap Tepat
        </h1>
        <p className="mt-5 max-w-xl text-lg md:text-xl font-semibold lg:[text-shadow:0_2px_16px_#0E1B2A,0_0_3px_#0E1B2A]">
          Menandai rujukan JKN yang perlu dicek lebih dulu, lengkap dengan
          alasannya.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <LightButton onClick={onEnter} className="px-7">
            Mulai cek <ArrowRight aria-hidden="true" size={18} />
          </LightButton>
          <a
            href="#cara-kerja"
            className="min-h-12 inline-flex items-center px-7 rounded-4xl font-bold text-white bg-[#1E3A5F] hover:bg-[#16304F] transition-colors"
          >
            Lihat cara kerja
          </a>
        </div>
      </div>
      <div className="relative h-72 order-2 lg:order-none lg:absolute lg:inset-0 lg:h-auto">
        <Image
          src="/images/hero-dokter.jpg"
          alt="Dokter tersenyum di meja kerja dengan laptop di klinik"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[60%_20%]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#0E1B2A]/60" />
      </div>
    </section>
  );
}
