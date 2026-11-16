import { VONIS } from "../../../data/vonis-kesesuaian";
import type { VonisKesesuaian } from "../../../types/hospital";

interface FitVerdictProps {
  vonis: VonisKesesuaian;
}

export function FitVerdict({ vonis }: FitVerdictProps) {
  const { label, bg } = VONIS[vonis];
  return (
    <span className="inline-block px-3 py-1 rounded-4xl text-xs font-bold text-white" style={{ backgroundColor: bg }}>
      {label}
    </span>
  );
}
