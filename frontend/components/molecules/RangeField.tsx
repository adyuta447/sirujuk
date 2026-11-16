interface RangeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  satuan: string;
}

/** Slider berlabel. Kosong = belum diatur. Warna kontrol mengikuti navy sistem. */
export function RangeField({ label, value, onChange, min, max, step, satuan }: RangeFieldProps) {
  return (
    <label className="block text-xs font-semibold text-[#56657A]">
      {label}: <span className="font-mono text-[#0E1B2A]">{value ? `${value} ${satuan}` : "belum diatur"}</span>
      <input type="range" min={min} max={max} step={step} value={value || min} onChange={(e) => onChange(e.target.value)} className="mt-2 block w-full accent-[#1E3A5F]" />
    </label>
  );
}
