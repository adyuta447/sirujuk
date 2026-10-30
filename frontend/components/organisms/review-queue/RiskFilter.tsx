import type { RiskFilterKey, RiskSegment } from "../../../types/queue";
import { RiskFilterChip } from "./RiskFilterChip";

interface RiskFilterProps {
  segments: RiskSegment[];
  active: RiskFilterKey;
  onChange: (key: RiskFilterKey) => void;
}

export function RiskFilter({ segments, active, onChange }: RiskFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {segments.map((segment) => (
        <RiskFilterChip
          key={segment.key}
          segment={segment}
          active={active === segment.key}
          onClick={() => onChange(segment.key)}
        />
      ))}
    </div>
  );
}
