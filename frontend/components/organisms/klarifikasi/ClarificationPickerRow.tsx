import { ChevronRight } from "lucide-react";
import { tampilPasien } from "../../../lib/formatters";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { RiskBadge } from "../../atoms/RiskBadge";

interface ClarificationPickerRowProps {
  kasus: RujukanCase;
  onPilih: (c: RujukanCase) => void;
}

export function ClarificationPickerRow({ kasus, onPilih }: ClarificationPickerRowProps) {
  return (
    <button
      type="button"
      onClick={() => onPilih(kasus)}
      className="w-full min-h-11 flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#0E1B2A]">{kasus.dokter}</div>
        <div className="text-xs text-[#56657A] truncate">{tampilPasien(kasus)} · {kasus.diagnosa}</div>
      </div>
      <RiskBadge level={kasus.risk} />
      <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
    </button>
  );
}
