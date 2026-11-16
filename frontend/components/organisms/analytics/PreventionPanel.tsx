"use client";

import { Info } from "lucide-react";
import { usePrevention } from "../../../hooks/usePrevention";
import { EmptyState } from "../../atoms/EmptyState";
import { NoticeBanner } from "../../atoms/NoticeBanner";
import { SectionLabel } from "../../atoms/SectionLabel";
import { CostEstimate } from "./CostEstimate";
import { LevelStatCard } from "./LevelStatCard";
import { PreventionFigures } from "./PreventionFigures";

/** Rujukan yang berpotensi dicegah dan estimasi efisiensinya. Hitungan dari skor model; bukan penghematan aktual. */
export function PreventionPanel() {
  const { data } = usePrevention();
  if (!data) return null;
  const kosong = data.by_fktp.length === 0 && data.by_fkrtl.length === 0;
  return (
    <section aria-label="Potensi pencegahan rujukan" className="space-y-3">
      <SectionLabel>Potensi pencegahan rujukan (estimasi)</SectionLabel>
      <NoticeBanner Icon={Info}>{data.cost.disclaimer}</NoticeBanner>
      <PreventionFigures data={data} />
      {kosong ? (
        <EmptyState title="Belum ada rujukan yang ditandai" body="Faskes dengan rujukan kuning atau merah akan tampil di sini." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <LevelStatCard title="Faskes asal (FKTP)" rows={data.by_fktp} />
          <LevelStatCard title="Faskes tujuan (FKRTL)" rows={data.by_fkrtl} />
        </div>
      )}
      <CostEstimate biaya={data.cost} />
      <p className="text-xs text-[#56657A] leading-relaxed">{data.basis}</p>
    </section>
  );
}
