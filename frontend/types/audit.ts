import type { Keputusan, RiskLevel } from "../lib/sirujuk-data";

export interface DecisionOptionData {
  value: Keputusan;
  label: string;
  desc: string;
  level: RiskLevel;
}
