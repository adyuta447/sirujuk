import type { RiskLevel } from "../lib/sirujuk-data";

export type RiskFilterKey = RiskLevel | "semua";

export interface RiskSegment {
  key: RiskFilterKey;
  label: string;
  count: number;
}
