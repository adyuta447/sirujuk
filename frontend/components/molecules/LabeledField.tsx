import { FIELD_CLASS } from "../../lib/ui-classes";

interface LabeledFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
}

export function LabeledField({ label, value, onChange, maxLength, multiline = false }: LabeledFieldProps) {
  return (
    <label className="block text-xs font-semibold text-[#56657A]">
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} className={`${FIELD_CLASS} mt-1 h-32 resize-none`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} className={`${FIELD_CLASS} mt-1`} />
      )}
    </label>
  );
}
