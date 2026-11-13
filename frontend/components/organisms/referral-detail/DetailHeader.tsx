import { NAVY } from "../../../lib/sirujuk-data";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { DetailFacts } from "./DetailFacts";
import { RouteTimeline } from "./RouteTimeline";
import { ScoreBadgeLarge } from "./ScoreBadgeLarge";

interface DetailHeaderProps {
  kasus: RujukanCase;
  onDokter: (nama: string) => void;
}

export function DetailHeader({ kasus, onDokter }: DetailHeaderProps) {
  return (
    <div className="rounded-4xl p-4 sm:p-5 text-white" style={{ backgroundColor: NAVY }}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#C9D6E6]">Detail rujukan</div>
          <div className="font-mono text-xs text-[#C9D6E6] mt-1">{kasus.noRujukan}</div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{kasus.pasien}</div>
        </div>
        <ScoreBadgeLarge level={kasus.risk} score={kasus.riskScore} dummy={kasus.skorDummy} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5">
        <DetailFacts kasus={kasus} onDokter={onDokter} />
        <RouteTimeline tanggal={kasus.tanggal} asal={kasus.fasalOrigin} tujuan={kasus.fasalTujuan} />
      </div>
    </div>
  );
}
