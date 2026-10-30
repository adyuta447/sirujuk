import { NAMA_PERAN } from "../../../lib/akses";
import type { Peran } from "../../../lib/akses";
import { inisial } from "../../../lib/formatters";

interface SidebarProfileProps {
  nama?: string;
  peran?: Peran;
}

export function SidebarProfile({ nama, peran }: SidebarProfileProps) {
  return (
    <div className="px-4 py-4 border-t border-[#2C4E78] flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-4xl flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: "#2C4E78" }}
      >
        {inisial(nama ?? "?")}
      </div>
      <div>
        <div className="text-xs font-semibold text-white">{nama ?? "…"}</div>
        <div className="text-[10px] text-[#C9D6E6]">{peran ? NAMA_PERAN[peran] : ""}</div>
      </div>
    </div>
  );
}
