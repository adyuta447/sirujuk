import { NAVY } from "../../../lib/sirujuk-data";
import type { Ringkasan } from "../../../lib/ringkasan";

interface DestinationBarProps {
  tujuan: Ringkasan["tujuanTerbanyak"][number];
}

export function DestinationBar({ tujuan: f }: DestinationBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#0E1B2A] font-medium truncate mr-2">{f.nama}</span>
        <span className="font-mono text-[#1E3A5F] shrink-0">{f.jumlah}</span>
      </div>
      <div className="h-2 rounded-4xl overflow-hidden bg-[#EEF1F5]">
        <div className="h-full rounded-4xl" style={{ width: `${f.porsi}%`, backgroundColor: NAVY }} />
      </div>
    </div>
  );
}
