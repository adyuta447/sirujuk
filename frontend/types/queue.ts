import type { RiskLevel } from "../lib/sirujuk-data";

export type RiskFilterKey = RiskLevel | "semua" | "ditahan";

export interface RiskSegment {
  key: RiskFilterKey;
  label: string;
  count: number;
}
