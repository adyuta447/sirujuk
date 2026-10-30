import type { Langkah } from "../../../types/langkah";

interface StepTextProps {
  step: Langkah;
  nomor: number;
  className: string;
}

export function StepText({ step, nomor, className }: StepTextProps) {
  return (
    <div className={`relative flex flex-col justify-center ${className}`}>
      <span
        aria-hidden="true"
        className="absolute -top-14 md:-top-20 -left-2 font-black tracking-tighter leading-none select-none text-[6rem] md:text-[9rem] text-white/10"
      >
        {nomor}
      </span>
      <div className="relative">
        <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-[#7DB4F5]">Langkah {nomor}</span>
        <h3 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]">{step.judul}</h3>
        <p className="mt-4 text-lg md:text-xl leading-relaxed text-[#D5DFEC] max-w-xl">{step.isi}</p>
      </div>
    </div>
  );
}
