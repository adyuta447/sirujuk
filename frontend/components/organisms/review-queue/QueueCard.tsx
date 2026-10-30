import { RISK } from "../../../lib/sirujuk-data";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";
import { ClaimBadge } from "../../atoms/ClaimBadge";
import { StatusBadge } from "../../atoms/StatusBadge";
import { QueueCardAction } from "./QueueCardAction";

interface QueueCardProps {
  kasus: RujukanCase;
  onSelect: (c: RujukanCase) => void;
}

export function QueueCard({ kasus: c, onSelect }: QueueCardProps) {
  const risk = RISK[c.risk];
  return (
    <Card
      as="article"
      className="px-5 sm:px-7 py-5 sm:py-6 hover:border-[#1E3A5F] transition-colors flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: risk.solid }}>{risk.label}</span>
          <span className="font-mono text-xs text-[#64748B]">Skor {c.riskScore}</span>
          <StatusBadge status={c.status} />
          <ClaimBadge status={c.claimStatus} />
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0E1B2A] mt-3">{c.pasien}</h3>
        <p className="text-sm text-[#56657A] mt-1.5 leading-relaxed">
          {c.usia ? `${c.usia} tahun, ` : ""}dari {c.wilayah}, dirujuk ke{" "}
          <span className="font-semibold text-[#0E1B2A]">{c.fasalTujuan}</span>
        </p>
        {c.alasan.length > 0 && (
          <p className="text-sm text-[#56657A] mt-4 leading-relaxed">
            <span className="font-semibold text-[#0E1B2A]">Kenapa perlu dicek: </span>
            {c.alasan[0].judul}
            {c.alasan.length > 1 ? `, dan ${c.alasan.length - 1} alasan lain` : ""}
          </p>
        )}
      </div>
      <div className="shrink-0 w-full sm:w-auto">
        <QueueCardAction kasus={c} onSelect={onSelect} />
      </div>
    </Card>
  );
}
