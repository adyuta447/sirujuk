import { Check } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";

interface AuditChecklistItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function AuditChecklistItem({ label, checked, onToggle }: AuditChecklistItemProps) {
  return (
    <label className="flex items-center gap-3 min-h-11 cursor-pointer rounded-4xl focus-within:outline focus-within:outline-2 focus-within:outline-[#1E3A5F]">
      <span
        className="w-5 h-5 rounded-4xl border-2 flex items-center justify-center shrink-0 transition-colors"
        style={
          checked
            ? { backgroundColor: NAVY, borderColor: NAVY, color: "#fff" }
            : { borderColor: "#C4CFDC", color: "transparent" }
        }
      >
        <Check size={13} />
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      <span className="text-sm text-[#0E1B2A]">{label}</span>
    </label>
  );
}
