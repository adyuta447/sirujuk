import { RISK } from "../../../lib/sirujuk-data";
import type { RiskLevel } from "../../../lib/sirujuk-data";
import type { Ringkasan } from "../../../lib/ringkasan";
import { SEBARAN } from "../../../data/risk-distribution";
import { Card } from "../../atoms/Card";

interface RiskDistributionProps {
  ringkasan: Ringkasan;
}

export function RiskDistribution({ ringkasan: r }: RiskDistributionProps) {
  return (
    <Card className="p-5 flex flex-col">
      <div className="font-bold text-[#0E1B2A]">Sebaran risiko</div>
      <div className="text-xs text-[#56657A] mt-0.5">Total {r.total} rujukan yang sudah dinilai</div>
      <div className="flex-1 flex items-end gap-3 mt-6">
        {SEBARAN.map(({ level, label }) => (
          <div key={level} className="flex-1 flex flex-col items-center gap-2">
            <div className="font-mono text-sm font-bold text-[#0E1B2A]">{r.sebaran[level]}%</div>
            <div
              className="w-full rounded-4xl"
              style={{ height: `${Math.max(8, r.sebaran[level])}px`, backgroundColor: RISK[level].solid }}
            />
            <div className="text-xs text-[#56657A]">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
