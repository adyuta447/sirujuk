import { TriangleAlert } from "lucide-react";
import { RISK } from "../../../lib/sirujuk-data";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { ReasonItem } from "./ReasonItem";

interface ReasonsCardProps {
  kasus: RujukanCase;
}

export function ReasonsCard({ kasus }: ReasonsCardProps) {
  const r = RISK[kasus.risk];
  return (
    <div className="bg-white rounded-4xl border-2 overflow-hidden" style={{ borderColor: r.solid }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ backgroundColor: r.solid, color: "#FFFFFF" }}>
        <TriangleAlert size={16} />
        <span className="font-bold text-sm">Kenapa rujukan ini perlu dicek</span>
      </div>
      {kasus.alasan.length > 0 ? (
        <div className="divide-y divide-[#EEF1F5]">
          {kasus.alasan.map((a, i) => (
            <ReasonItem key={a.judul} nomor={i + 1} alasan={a} warna={r.solid} />
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-sm" style={{ color: RISK.rendah.text }}>
          Tidak ada pola mencurigakan. Rujukan ini sesuai prosedur.
        </p>
      )}
    </div>
  );
}
