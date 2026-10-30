import { ChevronRight } from "lucide-react";
import { lebarMeter, persenAtauStrip } from "../../../lib/formatters";
import type { WilayahStat } from "../../../types/stats";
import { Card } from "../../atoms/Card";

interface RegionCardProps {
  wilayah: WilayahStat;
  onSelect: (w: string) => void;
}

export function RegionCard({ wilayah: w, onSelect }: RegionCardProps) {
  const rincian = [
    ["Rujukan", w.rujukan],
    ["Faskes", w.faskes],
    ["Median NS", persenAtauStrip(w.medianNS)],
    ["Rata-rata HHI", w.hhiRata === null ? "-" : w.hhiRata.toLocaleString("id-ID")],
  ];
  return (
    <button type="button" onClick={() => onSelect(w.wilayah)} className="text-left">
      <Card className="p-5 h-full hover:border-[#1E3A5F] transition-colors">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">{w.wilayah}</span>
          <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-[#56657A]">Perlu dicek</span>
            <span className="text-3xl font-extrabold tracking-tight tabular-nums text-[#0E1B2A]">{w.persenTinggi}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[#EEF1F5]" aria-hidden="true">
            <div className="h-full rounded-full bg-[#1E3A5F]" style={{ width: lebarMeter(w.persenTinggi) }} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-[#EEF1F5] text-xs">
          {rincian.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[#56657A]">{k}</dt>
              <dd className="text-lg font-bold tabular-nums text-[#0E1B2A]">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 text-xs font-semibold text-[#1E3A5F]">Lihat antrean wilayah ini</div>
      </Card>
    </button>
  );
}
