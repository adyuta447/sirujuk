import { Card } from "../atoms/Card";

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
}

export function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold text-[#56657A] mb-1">{label}</div>
      <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0E1B2A]">{value}</div>
      {sub && <div className="text-xs text-[#64748B] mt-1">{sub}</div>}
    </Card>
  );
}
