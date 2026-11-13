import { klaim } from "../../data/claim-styles";
import type { RujukanCase } from "../../lib/sirujuk-data";

interface ClaimBadgeProps {
  status: RujukanCase["claimStatus"];
}

/** Status klaim dari backend. "normal" tidak ditampilkan. Ikon + teks, bukan warna saja. */
export function ClaimBadge({ status }: ClaimBadgeProps) {
  if (!status || status === "normal") return null;
  const { label, bg, Icon } = klaim[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-4xl text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: bg }}>
      <Icon aria-hidden="true" size={12} />
      {label}
    </span>
  );
}
