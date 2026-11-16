import { RISK_DARI_KEPUTUSAN } from "../../../data/risk-dari-keputusan";
import { bangunRincianSkor } from "../../../lib/rincian-skor";
import type { HasilSimulasi } from "../../../types/simulate";
import { Card } from "../../atoms/Card";
import { RiskBadge } from "../../atoms/RiskBadge";
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
    <Card className="p-5 sm:p-6 space-y-5">
      <p role="note" className="text-xs font-bold uppercase tracking-wider text-[#9A5A08]">Hasil simulasi, bukan rujukan nyata</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-5xl font-extrabold text-[#0E1B2A]">{Math.round(model.score)}</span>
        <span className="text-sm text-[#56657A]">dari 100</span>
        <RiskBadge level={level} />
      </div>
      <p className="text-xs text-[#56657A]">Batas kuning {model.yellow_from}, batas merah {model.red_from}. Versi model {model.model_version}.</p>
      {hasil.baseline && <ScoreCompare baseline={hasil.baseline} selisih={hasil.delta_score} />}
      {rincian && <ContributionBreakdown rincian={rincian} risk={level} />}
      {hasil.destination_fit && <SimulationFit fit={hasil.destination_fit} catatan={hasil.not_in_model} />}
      <p className="text-xs text-[#56657A] leading-relaxed">{hasil.notice}</p>
    </Card>
  );
}
