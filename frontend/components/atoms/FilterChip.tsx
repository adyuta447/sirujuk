import { NAVY } from "../../lib/sirujuk-data";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  dotColor?: string;
}

/** Tombol filter bentuk pil: aktif navy solid, tidak aktif putih. Dipakai antrean dan direktori RS. */
export function FilterChip({ label, active, onClick, count, dotColor }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex items-center gap-2 min-h-11 pl-3 pr-3 py-2 rounded-4xl text-sm font-semibold border transition-colors"
      style={active ? { backgroundColor: NAVY, color: "#fff", borderColor: NAVY } : { backgroundColor: "#fff", color: "#56657A", borderColor: "#DCE3EC" }}
    >
      {dotColor && <span aria-hidden="true" className="w-2 h-2 rounded-4xl" style={{ backgroundColor: dotColor }} />}
      {label}
      {count !== undefined && (
        <span className="font-mono text-xs px-1.5 py-0.5 rounded-4xl" style={{ backgroundColor: active ? "#3A5880" : "#F4F6F9" }}>
          {count}
        </span>
      )}
    </button>
  );
}
