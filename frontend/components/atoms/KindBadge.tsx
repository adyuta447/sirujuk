import { JENIS_RS } from "../../data/jenis-rs";
import type { JenisRs } from "../../types/hospital";

interface KindBadgeProps {
  kind: JenisRs;
}

export function KindBadge({ kind }: KindBadgeProps) {
  const jenis = JENIS_RS.find((j) => j.key === kind);
  return (
    <span className="inline-block px-2.5 py-1 rounded-4xl text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: jenis?.bg ?? "#64748B" }}>
      {jenis?.label ?? kind}
    </span>
  );
}
