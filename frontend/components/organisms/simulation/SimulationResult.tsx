import { FlaskConical } from "lucide-react";
import { RISK_DARI_KEPUTUSAN } from "../../../data/risk-dari-keputusan";
import { bangunRincianSkor } from "../../../lib/rincian-skor";
import type { HasilSimulasi } from "../../../types/simulate";
import { NoticeBanner } from "../../atoms/NoticeBanner";
import { RiskBadge } from "../../atoms/RiskBadge";
import { TitledCard } from "../../molecules/TitledCard";
import { ContributionBreakdown } from "../referral-detail/ContributionBreakdown";
import { ScoreCompare } from "./ScoreCompare";
import { SimulationFit } from "./SimulationFit";

interface SimulationResultProps {
  hasil: HasilSimulasi;
}

export function SimulationResult({ hasil }: SimulationResultProps) {
  const { model } = hasil;
  const level = RISK_DARI_KEPUTUSAN[model.category] ?? "sedang";
  const rincian = bangunRincianSkor(model);
  return (
    <div className="space-y-5">
      <NoticeBanner Icon={FlaskConical}>HASIL SIMULASI, bukan rujukan nyata. Tidak disimpan.</NoticeBanner>
      <TitledCard title="Skor simulasi">
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-5xl font-extrabold text-[#0E1B2A]">{Math.round(model.score)}</span>
          <span className="text-sm text-[#56657A]">dari 100</span>
          <RiskBadge level={level} />
        </div>
        <p className="mt-3 text-xs text-[#56657A]">Batas kuning {model.yellow_from}, batas merah {model.red_from}. Versi model {model.model_version}.</p>
        {hasil.baseline && <div className="mt-3"><ScoreCompare baseline={hasil.baseline} selisih={hasil.delta_score} /></div>}
      </TitledCard>
      {rincian && (
        <TitledCard title="Kontribusi tiap faktor">
          <ContributionBreakdown rincian={rincian} risk={level} />
        </TitledCard>
      )}
      {hasil.destination_fit && (
        <TitledCard title="Kesesuaian RS tujuan (asumsi)">
          <SimulationFit fit={hasil.destination_fit} catatan={hasil.not_in_model} />
        </TitledCard>
      )}
      <p className="text-xs text-[#56657A] leading-relaxed">{hasil.notice}</p>
    </div>
  );
}
