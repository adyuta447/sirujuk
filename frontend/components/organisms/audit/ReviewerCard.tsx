import { NAMA_PERAN } from "../../../lib/akses";
import type { Peran } from "../../../lib/akses";
import { formatVerifierDate, inisial } from "../../../lib/formatters";
import { NAVY } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";

interface ReviewerCardProps {
  nama?: string;
  peran?: Peran;
}

export function ReviewerCard({ nama, peran }: ReviewerCardProps) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3 text-sm">
      <div
        className="w-8 h-8 rounded-4xl flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: NAVY }}
      >
        {inisial(nama ?? "?")}
      </div>
      <div>
        <div className="font-semibold text-[#0E1B2A]">{nama ?? "…"}</div>
        <div className="text-xs text-[#56657A]">
          {peran ? NAMA_PERAN[peran] : ""}, {formatVerifierDate(new Date())} WIB
        </div>
      </div>
    </Card>
  );
}
