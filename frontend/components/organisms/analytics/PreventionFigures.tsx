import type { Pencegahan } from "../../../types/prevention";
import { KpiCard } from "../../molecules/KpiCard";

interface PreventionFiguresProps {
  data: Pencegahan;
}

export function PreventionFigures({ data }: PreventionFiguresProps) {
  const persen = data.kns_percent.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <KpiCard label="Diagnosis wajib FKTP" value={data.kns_total} sub={`${persen}% dari ${data.total} rujukan dinilai`} />
      <KpiCard label="Kandidat pencegahan" value={data.kns_flagged} sub="kuning atau merah" />
      <KpiCard label="Terkonfirmasi tidak valid" value={data.kns_confirmed_invalid} sub="sudah diaudit petugas" />
    </div>
  );
}
