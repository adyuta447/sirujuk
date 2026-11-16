"use client";

import { usePrevention } from "../../../hooks/usePrevention";
import { SectionLabel } from "../../atoms/SectionLabel";
import { CostEstimate } from "./CostEstimate";
import { LevelStatCard } from "./LevelStatCard";
import { PreventionFigures } from "./PreventionFigures";

/** Rujukan yang berpotensi dicegah dan estimasi efisiensinya. Hitungan dari skor model; bukan penghematan aktual. */
export function PreventionPanel() {
  const { data } = usePrevention();
  if (!data) return null;
  return (
    <section aria-label="Potensi pencegahan rujukan" className="space-y-4">
      <SectionLabel>Potensi pencegahan rujukan (estimasi)</SectionLabel>
      <PreventionFigures data={data} />
      <div className="grid lg:grid-cols-3 gap-4">
        <LevelStatCard title="Faskes asal (FKTP)" rows={data.by_fktp} />
        <LevelStatCard title="Faskes tujuan (FKRTL)" rows={data.by_fkrtl} />
        <CostEstimate biaya={data.cost} />
      </div>
      <p className="text-xs text-[#56657A] leading-relaxed">{data.basis}</p>
    </section>
  );
}
