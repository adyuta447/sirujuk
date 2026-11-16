import { Bell } from "lucide-react";
import { NAMA_PERAN } from "../../../lib/akses";
import type { Peran } from "../../../lib/akses";
import { inisial } from "../../../lib/formatters";

interface SidebarProfileProps {
  nama?: string;
  peran?: Peran;
  belumDibaca: number;
  onAktivitas: () => void;
}

export function SidebarProfile({ nama, peran, belumDibaca, onAktivitas }: SidebarProfileProps) {
  return (
    <div className="px-4 py-4 border-t border-[#2C4E78] flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: "#2C4E78" }}
      >
        {inisial(nama ?? "?")}
      </div>
      <div className="min-w-0 flex-1">
        <div title={nama} className="text-xs font-semibold text-white truncate">{nama ?? "…"}</div>
        <div className="text-[10px] text-[#C9D6E6]">{peran ? NAMA_PERAN[peran] : ""}</div>
      </div>
      <button
        type="button"
        onClick={onAktivitas}
        aria-label={belumDibaca > 0 ? `Aktivitas, ${belumDibaca} belum dibaca` : "Aktivitas"}
        className="relative w-9 h-9 shrink-0 rounded-4xl flex items-center justify-center text-[#D5DFEC] hover:bg-[#27446B] transition-colors"
      >
        <Bell aria-hidden="true" size={18} />
        {belumDibaca > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-4xl bg-[#C42222] text-white text-[10px] font-bold flex items-center justify-center">
            {belumDibaca > 9 ? "9+" : belumDibaca}
          </span>
        )}
      </button>
    </div>
  );
}
