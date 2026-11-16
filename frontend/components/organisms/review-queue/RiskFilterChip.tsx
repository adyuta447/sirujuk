import { klaim } from "../../../data/claim-styles";
import { RISK } from "../../../lib/sirujuk-data";
import type { RiskSegment } from "../../../types/queue";
import { FilterChip } from "../../atoms/FilterChip";

interface RiskFilterChipProps {
  segment: RiskSegment;
  active: boolean;
  onClick: () => void;
}

export function RiskFilterChip({ segment, active, onClick }: RiskFilterChipProps) {
  const dot = segment.key === "semua" ? undefined : segment.key === "ditahan" ? klaim.ditahan.bg : RISK[segment.key].solid;
  return <FilterChip label={segment.label} active={active} onClick={onClick} count={segment.count} dotColor={dot} />;
}
