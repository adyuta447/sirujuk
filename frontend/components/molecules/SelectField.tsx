import { ChevronDown } from "lucide-react";
import { FIELD_CLASS } from "../../lib/ui-classes";

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

/** Select berlabel dengan panah sendiri (bukan bawaan browser), supaya jaraknya ke tepi sama seperti form lain. */
export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block text-xs font-semibold text-[#56657A]">
      {label}
      <div className="relative mt-1">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD_CLASS} appearance-none pr-11 cursor-pointer`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#56657A]" />
      </div>
    </label>
  );
}
