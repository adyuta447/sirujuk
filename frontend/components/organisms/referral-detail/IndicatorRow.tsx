import { RISK } from "../../../lib/sirujuk-data";
import type { RujukanCase } from "../../../lib/sirujuk-data";

interface IndicatorRowProps {
  row: NonNullable<RujukanCase["indikator"]>[number];
}

export function IndicatorRow({ row }: IndicatorRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
      <div>
        <div className="font-semibold text-[#0E1B2A]">{row.label}</div>
        <div className="text-xs text-[#56657A] mt-0.5 leading-relaxed">{row.banding}</div>
      </div>
      <span className="font-mono font-bold sm:text-right shrink-0" style={{ color: RISK[row.level].text }}>
        {row.nilai}
      </span>
    </div>
  );
}
