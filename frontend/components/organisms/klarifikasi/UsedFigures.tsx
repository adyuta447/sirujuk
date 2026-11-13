import type { RujukanCase } from "../../../lib/sirujuk-data";
import { TitledCard } from "../../molecules/TitledCard";

interface UsedFiguresProps {
  indikator: NonNullable<RujukanCase["indikator"]>;
}

export function UsedFigures({ indikator }: UsedFiguresProps) {
  return (
    <TitledCard title="Angka yang dipakai">
      <ul className="mt-3 divide-y divide-[#EEF1F5]">
        {indikator.map((i) => (
          <li key={i.label} className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-[#0E1B2A]">{i.label}</div>
              <div className="text-xs text-[#56657A] mt-0.5">{i.banding}</div>
            </div>
            <span className="font-mono font-extrabold text-lg text-[#0E1B2A] shrink-0">{i.nilai}</span>
          </li>
        ))}
      </ul>
    </TitledCard>
  );
}
