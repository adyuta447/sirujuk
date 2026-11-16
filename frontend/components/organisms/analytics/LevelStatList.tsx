import type { StatFaskes } from "../../../types/prevention";

interface LevelStatListProps {
  title: string;
  rows: StatFaskes[];
}

export function LevelStatList({ title, rows }: LevelStatListProps) {
  return (
    <div>
      <div className="text-sm font-bold text-[#0E1B2A]">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-[#56657A]">Belum ada rujukan yang ditandai.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#EEF1F5]">
          {rows.map((r) => (
            <li key={r.id} className="py-2 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[#0E1B2A] truncate">{r.id}</span>
              <span className="font-mono text-xs text-[#56657A] shrink-0">
                {r.flagged}/{r.total} ditandai ({r.flagged_percent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%), {r.red} merah
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
