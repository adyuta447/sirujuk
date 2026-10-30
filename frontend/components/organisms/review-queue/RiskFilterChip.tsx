import { NAVY, RISK } from "../../../lib/sirujuk-data";
import type { RiskSegment } from "../../../types/queue";

interface RiskFilterChipProps {
  segment: RiskSegment;
  active: boolean;
  onClick: () => void;
}

export function RiskFilterChip({ segment, active, onClick }: RiskFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 min-h-11 pl-3 pr-2 py-2 rounded-4xl text-sm font-semibold border transition-colors"
      style={
        active
          ? { backgroundColor: NAVY, color: "#fff", borderColor: NAVY }
          : { backgroundColor: "#fff", color: "#56657A", borderColor: "#DCE3EC" }
      }
    >
      {segment.key !== "semua" && (
        <span className="w-2 h-2 rounded-4xl" style={{ backgroundColor: RISK[segment.key].solid }} />
      )}
      {segment.label}
      <span
        className="font-mono text-xs px-1.5 py-0.5 rounded-4xl"
        style={{ backgroundColor: active ? "#3A5880" : "#F4F6F9" }}
      >
        {segment.count}
      </span>
    </button>
  );
}
