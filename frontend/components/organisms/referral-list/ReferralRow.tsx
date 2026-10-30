import type { RujukanCase } from "../../../lib/sirujuk-data";
import { RiskBadge } from "../../atoms/RiskBadge";
import { RouteDots } from "./RouteDots";

interface ReferralRowProps {
  kasus: RujukanCase;
  onSelect: (c: RujukanCase) => void;
}

export function ReferralRow({ kasus: c, onSelect }: ReferralRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      className="w-full grid grid-cols-1 sm:grid-cols-[1.2fr_1.4fr_auto] gap-2 sm:gap-4 items-start sm:items-center px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
    >
      <div className="min-w-0">
        <div className="font-semibold text-sm text-[#0E1B2A]">{c.pasien}</div>
        <div className="font-mono text-xs text-[#64748B]">{c.noRujukan}</div>
      </div>
      <div className="flex items-stretch gap-2.5 min-w-0">
        <RouteDots />
        <div className="flex flex-col justify-between min-w-0 py-0.5">
          <span className="text-xs text-[#56657A] truncate leading-snug">{c.fasalOrigin}</span>
          <span className="text-sm font-semibold text-[#0E1B2A] truncate leading-snug">{c.fasalTujuan}</span>
        </div>
      </div>
      <RiskBadge level={c.risk} score={c.riskScore} />
    </button>
  );
}
