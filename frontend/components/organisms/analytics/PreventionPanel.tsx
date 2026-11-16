"use client";

import { usePrevention } from "../../../hooks/usePrevention";
import { TitledCard } from "../../molecules/TitledCard";
import { CostEstimate } from "./CostEstimate";
import { LevelStatList } from "./LevelStatList";
import { PreventionFigures } from "./PreventionFigures";

/** Rujukan yang berpotensi dicegah dan estimasi efisiensinya. Hitungan dari skor model; bukan penghematan aktual. */
export function PreventionPanel() {
  const { data } = usePrevention();
  if (!data) return null;
  return (
    <TitledCard title="Potensi pencegahan rujukan (estimasi)">
      <PreventionFigures data={data} />
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <LevelStatList title="Faskes asal (FKTP)" rows={data.by_fktp} />
        <LevelStatList title="Faskes tujuan (FKRTL)" rows={data.by_fkrtl} />
      </div>
      <div className="mt-5">
        <CostEstimate biaya={data.cost} />
      </div>
      <p className="mt-4 text-xs text-[#56657A] leading-relaxed">{data.basis}</p>
    </TitledCard>
  );
}
