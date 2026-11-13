import { RISK } from "../../../lib/sirujuk-data";
import type { DecisionOptionData } from "../../../types/audit";

interface DecisionOptionProps {
  option: DecisionOptionData;
  selected: boolean;
  onSelect: () => void;
}

export function DecisionOption({
  option,
  selected,
  onSelect,
}: DecisionOptionProps) {
  const warna = RISK[option.level];
  return (
    <label
      className="flex items-start gap-3.5 p-4 rounded-4xl border-2 cursor-pointer transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1E3A5F]"
      style={
        selected
          ? { backgroundColor: warna.solid, borderColor: warna.solid }
          : { backgroundColor: "#fff", borderColor: "#DCE3EC" }
      }
    >
      <input
        type="radio"
        name="keputusan"
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />
      <span
        className="mt-0.5 w-5 h-5 rounded-4xl border-2 shrink-0 flex items-center justify-center"
        style={{ borderColor: selected ? "#fff" : "#C4CFDC" }}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-4xl bg-white" />}
      </span>
      <div>
        <div
          className="font-bold text-sm"
          style={{ color: selected ? "#fff" : "#0E1B2A" }}
        >
          {option.label}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ color: selected ? "#fff" : "#56657A" }}
        >
          {option.desc}
        </div>
      </div>
    </label>
  );
}
