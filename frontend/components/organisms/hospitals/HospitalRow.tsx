import { JENIS_RS } from "../../../data/jenis-rs";
import type { Rs } from "../../../types/hospital";

interface HospitalRowProps {
  rs: Rs;
}

export function HospitalRow({ rs }: HospitalRowProps) {
  const jenis = JENIS_RS.find((j) => j.key === rs.kind)?.label ?? rs.kind;
  return (
    <li className="px-5 py-4 space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-bold text-sm text-[#0E1B2A]">{rs.name}</span>
        <span className="font-mono text-xs text-[#64748B]">{rs.id}</span>
      </div>
      <p className="text-xs text-[#56657A]">
        {jenis}
        {rs.class ? ` · Kelas ${rs.class}` : ""} · {rs.wilayah || "Wilayah tidak tercatat"}
      </p>
      <p className="text-xs text-[#56657A]">
        Spesialisasi: {rs.specialization?.length ? rs.specialization.join(", ") : "tidak tercatat"} · Sumber: {rs.source}
      </p>
    </li>
  );
}
