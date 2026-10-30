import { persen } from "../../../lib/ringkasan";
import type { Ringkasan } from "../../../lib/ringkasan";
import { KpiCard } from "../../molecules/KpiCard";

interface KpiGridProps {
  ringkasan: Ringkasan;
}

export function KpiGrid({ ringkasan: r }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Total rujukan" value={r.total} sub="yang sudah dinilai" />
      <KpiCard label="Perlu dicek" value={r.perluDicek} sub={`${persen(r.perluDicek, r.total)}% dari total`} />
      <KpiCard label="Sudah dicek" value={r.sudahDicek} sub="sudah ada hasil audit" />
      <KpiCard label="Menunggu" value={r.menunggu} sub="belum ditinjau" />
    </div>
  );
}
