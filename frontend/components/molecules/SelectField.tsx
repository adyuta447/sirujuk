import { FIELD_CLASS } from "../../lib/ui-classes";

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block text-xs font-semibold text-[#56657A]">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD_CLASS} mt-1 cursor-pointer`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
