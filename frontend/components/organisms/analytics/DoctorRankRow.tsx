import { NAVY, RISK } from "../../../lib/sirujuk-data";
import type { DokterStat } from "../../../types/stats";

interface DoctorRankRowProps {
  rank: number;
  dokter: DokterStat;
  onSelect: (nama: string) => void;
}

export function DoctorRankRow({ rank, dokter: d, onSelect }: DoctorRankRowProps) {
  const col = d.persentase > 25 ? RISK.tinggi : RISK.sedang;
  return (
    <button
      type="button"
      onClick={() => onSelect(d.nama)}
      className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
    >
      <div
        className="w-7 h-7 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: NAVY, color: "#FFFFFF" }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-[#0E1B2A]">{d.nama}</span>
          <span className="text-xs text-[#64748B]">{d.fktp}</span>
        </div>
        <p className="text-xs text-[#56657A] mt-1 leading-relaxed">
          {d.narasi}
          {d.darurat > 0 && ` Rujukan darurat: ${d.darurat} (${d.persenDarurat.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%).`}
        </p>
        <div className="mt-2 h-1.5 rounded-4xl overflow-hidden bg-[#EEF1F5] max-w-xs">
          <div className="h-full rounded-4xl" style={{ width: `${d.persentase * 3}%`, backgroundColor: col.solid }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono font-bold text-sm" style={{ color: col.solid }}>{d.persentase}%</div>
        <div className="text-xs text-[#64748B]">{d.risikoTinggi} dari {d.totalRujukan}</div>
      </div>
    </button>
  );
}
