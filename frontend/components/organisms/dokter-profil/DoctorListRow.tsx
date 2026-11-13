import { ChevronRight } from "lucide-react";
import type { DokterStat } from "../../../types/stats";

interface DoctorListRowProps {
  dokter: DokterStat;
  onSelect: (nama: string) => void;
}

export function DoctorListRow({ dokter, onSelect }: DoctorListRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(dokter.nama)}
      className="w-full min-h-11 flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#0E1B2A]">{dokter.nama}</div>
        <div className="text-xs text-[#56657A] truncate">{dokter.fktp}</div>
      </div>
      <span className="font-mono text-sm font-bold text-[#0E1B2A]">{dokter.persentase}%</span>
      <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
    </button>
  );
}
