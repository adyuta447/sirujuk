import { Check, Lock, ShieldAlert } from "lucide-react";
import type { RujukanCase } from "../../lib/sirujuk-data";

const klaim = {
  ditahan: { label: "Klaim ditahan sementara", bg: "#9A5A08", Icon: Lock },
  dilepas: { label: "Klaim dilepas", bg: "#17803F", Icon: Check },
  "temuan-terkonfirmasi": { label: "Temuan terkonfirmasi", bg: "#C42222", Icon: ShieldAlert },
} as const;

/** Status klaim dari backend. "normal" tidak ditampilkan. Ikon + teks, bukan warna saja. */
export function ClaimBadge({ status }: { status: RujukanCase["claimStatus"] }) {
  if (!status || status === "normal") return null;
  const { label, bg, Icon } = klaim[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-4xl text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: bg }}>
      <Icon aria-hidden="true" size={12} />
      {label}
    </span>
  );
}
