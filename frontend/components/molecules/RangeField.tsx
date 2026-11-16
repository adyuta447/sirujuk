import { useId } from "react";
import type { CSSProperties } from "react";

interface RangeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  satuan: string;
}

/** Slider berlabel. Kosong = belum diatur (tombol abu-abu); nilai tampil sebagai chip, dan bisa diatur ulang. */
export function RangeField({ label, value, onChange, min, max, step, satuan }: RangeFieldProps) {
  const id = useId();
  const teks = value ? `${value} ${satuan}` : "Belum diatur";
  const isi = value ? ((Number(value) - min) / (max - min)) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-[#56657A]">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {value && (
            <button type="button" onClick={() => onChange("")} className="min-h-8 px-2 text-xs font-semibold text-[#56657A] hover:text-[#0E1B2A]">
              Atur ulang
            </button>
          )}
          <span className={`font-mono text-sm font-bold px-3 py-1 rounded-4xl ${value ? "bg-[#1E3A5F] text-white" : "bg-[#EEF1F5] text-[#64748B]"}`}>{teks}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value || min}
        aria-valuetext={teks}
        data-kosong={value ? undefined : ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ "--isi": `${isi}%` } as CSSProperties}
        className="slider-modern"
      />
      <div className="flex justify-between font-mono text-[11px] text-[#64748B]">
        <span>{min} {satuan}</span>
        <span>{max} {satuan}</span>
      </div>
    </div>
  );
}
