import { JENIS_RS } from "../../../data/jenis-rs";
import { NAVY } from "../../../lib/sirujuk-data";

interface KindFilterProps {
  active: string;
  onChange: (kind: string) => void;
}

export function KindFilter({ active, onChange }: KindFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {JENIS_RS.map((j) => (
        <button
          key={j.key}
          type="button"
          aria-pressed={active === j.key}
          onClick={() => onChange(j.key)}
          className="min-h-11 px-4 py-2 rounded-4xl text-sm font-semibold border transition-colors"
          style={active === j.key ? { backgroundColor: NAVY, color: "#fff", borderColor: NAVY } : { backgroundColor: "#fff", color: "#56657A", borderColor: "#DCE3EC" }}
        >
          {j.label}
        </button>
      ))}
    </div>
  );
}
