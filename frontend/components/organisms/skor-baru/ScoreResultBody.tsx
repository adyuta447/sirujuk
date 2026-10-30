import type { RiskLevel } from "../../../lib/sirujuk-data";
import type { RiskDecision } from "../../../types/referral";
import { RiskBadge } from "../../atoms/RiskBadge";
import { ScoreReasonList } from "./ScoreReasonList";

interface ScoreResultBodyProps {
  data: RiskDecision;
  level: RiskLevel;
}

export function ScoreResultBody({ data, level }: ScoreResultBodyProps) {
  return (
    <div className="mt-3 space-y-4">
      <div className="flex items-center gap-3">
        <RiskBadge level={level} />
        <span className="text-sm text-[#56657A]">
          Skor{" "}
          <span className="font-mono font-extrabold text-2xl text-[#0E1B2A]">
            {data.score.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
          </span>{" "}
          dari 100
        </span>
      </div>
      {data.reasons && data.reasons.length > 0 && <ScoreReasonList reasons={data.reasons} />}
      {data.requires_human_review && (
        <p className="rounded-4xl px-4 py-3 text-sm bg-[#1E3A5F] text-white">
          Perlu ditinjau petugas. Skor ini prioritas peninjauan, bukan bukti kecurangan. Kinerja model baru diukur pada data sintetis.
        </p>
      )}
      {data.model_version && <p className="text-xs text-[#56657A]">Versi model: {data.model_version}</p>}
    </div>
  );
}
