import type { HasilSimulasi } from "../../../types/simulate";

interface ScoreCompareProps {
  baseline: NonNullable<HasilSimulasi["baseline"]>;
  selisih?: number;
}

export function ScoreCompare({ baseline, selisih }: ScoreCompareProps) {
  const tanda = selisih === undefined ? "" : ` (${selisih > 0 ? "+" : ""}${selisih.toFixed(1)})`;
  return (
    <div className="text-sm text-[#56657A] space-y-1">
      <p>
        Skor rujukan asli: <span className="font-mono font-bold text-[#0E1B2A]">{Math.round(baseline.score)}</span>
        {tanda}
      </p>
      {!baseline.same_model_version && (
        <p role="note">Versi model berbeda dengan saat rujukan itu dinilai, jadi selisih ikut dipengaruhi pembaruan model.</p>
      )}
    </div>
  );
}
