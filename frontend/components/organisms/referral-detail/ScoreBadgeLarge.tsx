import { RISK } from "../../../lib/sirujuk-data";
import type { RiskLevel } from "../../../lib/sirujuk-data";

interface ScoreBadgeLargeProps {
  level: RiskLevel;
  score: number;
  dummy?: boolean;
}

export function ScoreBadgeLarge({ level, score, dummy }: ScoreBadgeLargeProps) {
  const r = RISK[level];
  return (
    <div className="text-center">
      <div
        role="img"
        className="w-20 h-20 rounded-4xl flex flex-col items-center justify-center"
        aria-label={`${r.label}, skor ${score}`}
        style={{ backgroundColor: r.solid }}
      >
        <span className="font-mono text-3xl font-extrabold">{score}</span>
        <span className="text-[10px] uppercase tracking-wider">skor</span>
      </div>
      <div className="mt-2 text-xs font-semibold text-[#D5DFEC]">
        {r.label}
        {dummy && " · skor dummy"}
      </div>
    </div>
  );
}
