import { Check } from "lucide-react";
import { NAVY } from "../../lib/sirujuk-data";

interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Centang berlabel: lingkaran navy bila dipilih. Kotak centang asli disembunyikan tetapi tetap bisa difokus keyboard. */
export function CheckField({ label, checked, onChange }: CheckFieldProps) {
  return (
    <label className="flex items-center gap-3 min-h-11 cursor-pointer">
      {/* Penanda fokus keyboard ada di lingkaran, bukan garis di sekeliling baris. */}
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className="w-5 h-5 rounded-4xl border-2 flex items-center justify-center shrink-0 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1E3A5F]"
        style={
          checked
            ? { backgroundColor: NAVY, borderColor: NAVY, color: "#fff" }
            : { borderColor: "#C4CFDC", color: "transparent" }
        }
      >
        <Check size={13} />
      </span>
      <span className="text-sm text-[#0E1B2A]">{label}</span>
    </label>
  );
}
