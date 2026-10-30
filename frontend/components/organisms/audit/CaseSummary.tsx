import type { RujukanCase } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";
import { RiskBadge } from "../../atoms/RiskBadge";

interface CaseSummaryProps {
  kasus: RujukanCase;
}

export function CaseSummary({ kasus }: CaseSummaryProps) {
  const rincian = [
    ["Diagnosis", kasus.diagnosa],
    ["Dari", kasus.fasalOrigin],
    ["Dirujuk ke", kasus.fasalTujuan],
    ["Dokter", kasus.dokter],
  ];
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold text-[#0E1B2A]">Ringkasan rujukan</div>
        <RiskBadge level={kasus.risk} score={kasus.riskScore} />
      </div>
      <dl className="space-y-3 text-sm">
        {rincian.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-[#56657A]">{k}</dt>
            <dd className="font-semibold text-[#0E1B2A]">{v}</dd>
          </div>
        ))}
      </dl>
      {kasus.alasan.length > 0 && (
        <div className="pt-4 border-t border-[#EEF1F5]">
          <div className="text-xs text-[#56657A] mb-2">Alasan ditandai</div>
          <ul className="space-y-2 text-sm text-[#0E1B2A] list-disc pl-4">
            {kasus.alasan.map((a) => (
              <li key={a.judul}>{a.judul}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
