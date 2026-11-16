import { JENIS_RS } from "../../../data/jenis-rs";
import { FilterChip } from "../../atoms/FilterChip";

interface KindFilterProps {
  active: string;
  onChange: (kind: string) => void;
}

export function KindFilter({ active, onChange }: KindFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {JENIS_RS.map((j) => (
        <FilterChip key={j.key} label={j.label} active={active === j.key} onClick={() => onChange(j.key)} />
      ))}
    </div>
  );
}
