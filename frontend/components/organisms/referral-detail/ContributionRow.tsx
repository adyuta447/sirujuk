import { lebarMeter } from "../../../lib/formatters";
import type { FaktorSkor } from "../../../lib/sirujuk-data";

interface ContributionRowProps {
  faktor: FaktorSkor;
  dominan: boolean;
  warna: string;
}

export function ContributionRow({ faktor, dominan, warna }: ContributionRowProps) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-[#0E1B2A]">
          {faktor.label}
          {dominan && <span className="ml-2 text-xs font-bold" style={{ color: warna }}>Paling dominan</span>}
        </span>
        <span className="font-mono font-bold text-[#0E1B2A] shrink-0">{faktor.persen}%</span>
      </div>
      <div
        role="meter"
        aria-label={faktor.label}
        aria-valuenow={faktor.persen}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 rounded-4xl bg-[#EEF1F5] overflow-hidden"
      >
        <div className="h-full rounded-4xl" style={{ width: lebarMeter(faktor.persen), backgroundColor: warna }} />
      </div>
    </li>
  );
}
