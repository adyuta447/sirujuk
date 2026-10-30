import { ChevronRight } from "lucide-react";
import { tampilPasien } from "../../lib/formatters";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { RiskBadge } from "../atoms/RiskBadge";

interface CaseRowProps {
  kasus: RujukanCase;
  onSelect: (c: RujukanCase) => void;
}

/** Baris ringkas rujukan: pasien, diagnosis, skor risiko. */
export function CaseRow({ kasus, onSelect }: CaseRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(kasus)}
      className="w-full min-h-11 flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#0E1B2A]">{tampilPasien(kasus)}</div>
        <div className="text-xs text-[#56657A] truncate">{kasus.diagnosa}</div>
      </div>
      <RiskBadge level={kasus.risk} score={kasus.riskScore} />
      <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
    </button>
  );
}
