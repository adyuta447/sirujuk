import { bangunKartuAnalitik } from "../../../lib/kartu-analitik";
import type { Ringkasan } from "../../../lib/ringkasan";
import { StatCard } from "../../molecules/StatCard";

interface KpiGridProps {
  ringkasan: Ringkasan;
}

export function KpiGrid({ ringkasan }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {bangunKartuAnalitik(ringkasan).map((kartu) => (
        <StatCard key={kartu.label} data={kartu} />
      ))}
    </div>
  );
}
