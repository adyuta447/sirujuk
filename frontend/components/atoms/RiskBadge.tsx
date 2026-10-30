import { ICON } from "../../data/risk-icons";
import { RISK } from "../../lib/sirujuk-data";
import type { RiskLevel } from "../../lib/sirujuk-data";

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const color = RISK[level];
  const Icon = ICON[level];

  return (
    <span
      role="status"
      aria-label={`${color.label}${score != null ? `, skor ${score}` : ""}`}
      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-4xl text-xs font-bold text-white whitespace-nowrap"
      style={{ backgroundColor: color.solid }}
    >
      <Icon aria-hidden="true" size={12} />
      {color.label}
      {score != null && (
        <span className="font-mono px-1.5 py-0.5 rounded-4xl bg-white text-[#0E1B2A]">{score}</span>
      )}
    </span>
  );
}
