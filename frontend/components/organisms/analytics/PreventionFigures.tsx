import type { Pencegahan } from "../../../types/prevention";
import { KpiCard } from "../../molecules/KpiCard";

interface PreventionFiguresProps {
  data: Pencegahan;
}

export function PreventionFigures({ data }: PreventionFiguresProps) {
  return (
    <div className="grid sm:grid-cols-3 gap-3 mt-3">
      <KpiCard label="Diagnosis wajib FKTP" value={data.kns_total} sub={`${data.kns_percent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari ${data.total} rujukan dinilai`} />
      <KpiCard label="Kandidat pencegahan" value={data.kns_flagged} sub="kuning atau merah, diagnosisnya wajib diselesaikan FKTP" />
      <KpiCard label="Terkonfirmasi tidak valid" value={data.kns_confirmed_invalid} sub="satu-satunya yang didukung audit manusia" />
    </div>
  );
}
