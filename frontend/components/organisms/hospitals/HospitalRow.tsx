import type { Rs } from "../../../types/hospital";
import { Chip } from "../../atoms/Chip";
import { KindBadge } from "../../atoms/KindBadge";

interface HospitalRowProps {
  rs: Rs;
}

export function HospitalRow({ rs }: HospitalRowProps) {
  const lokasi = [rs.class && `Kelas ${rs.class}`, rs.wilayah || "Wilayah tidak tercatat"].filter(Boolean).join(" · ");
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[1.4fr_1.2fr_auto] gap-2 sm:gap-4 items-start sm:items-center px-5 py-3.5">
      <div className="min-w-0">
        <div className="font-semibold text-sm text-[#0E1B2A]">{rs.name}</div>
        <div className="text-xs text-[#56657A]">{lokasi}</div>
        {rs.id !== rs.name && <div className="font-mono text-xs text-[#64748B]">{rs.id}</div>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rs.specialization?.length ? (
          rs.specialization.map((s) => <Chip key={s}>{s}</Chip>)
        ) : (
          <span className="text-xs text-[#64748B]">Belum tercatat</span>
        )}
      </div>
      <KindBadge kind={rs.kind} />
    </li>
  );
}
