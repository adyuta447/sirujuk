import { RISK } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";
import type { Outcome } from "../../../types/landing";

interface OutcomeCardProps {
  outcome: Outcome;
}

export function OutcomeCard({ outcome: { label, isi, tone, Icon } }: OutcomeCardProps) {
  const warna = RISK[tone];
  return (
    <Card className="p-5">
      <span
        aria-hidden="true"
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: warna.soft, color: warna.solid }}
      >
        <Icon size={24} />
      </span>
      <div className="text-xl font-extrabold tracking-tight mt-4" style={{ color: warna.solid }}>{label}</div>
      <p className="text-sm text-[#56657A] mt-1">{isi}</p>
    </Card>
  );
}
