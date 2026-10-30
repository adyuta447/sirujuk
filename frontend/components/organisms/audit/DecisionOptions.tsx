import { OPSI_KEPUTUSAN } from "../../../data/audit-options";
import type { Keputusan } from "../../../lib/sirujuk-data";
import { DecisionOption } from "./DecisionOption";

interface DecisionOptionsProps {
  selected: Keputusan | null;
  onChange: (value: Keputusan) => void;
}

export function DecisionOptions({ selected, onChange }: DecisionOptionsProps) {
  return (
    <div className="space-y-2.5">
      <div className="text-sm font-bold text-[#0E1B2A]">Pilih keputusan</div>
      {OPSI_KEPUTUSAN.map((option) => (
        <DecisionOption
          key={option.value}
          option={option}
          selected={selected === option.value}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
