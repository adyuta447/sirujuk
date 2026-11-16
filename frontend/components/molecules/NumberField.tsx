import { FIELD_CLASS } from "../../lib/ui-classes";

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

export function NumberField({ label, value, onChange, hint, min, max, placeholder = "Tidak diubah" }: NumberFieldProps) {
  return (
    <label className="block text-xs font-semibold text-[#56657A]">
      {label}
      <input type="number" inputMode="decimal" min={min} max={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${FIELD_CLASS} mt-1`} />
      {hint && <span className="block mt-1 font-normal text-[#64748B]">{hint}</span>}
    </label>
  );
}
