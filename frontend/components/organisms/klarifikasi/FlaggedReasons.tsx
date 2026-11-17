import type { RujukanCase } from "../../../lib/sirujuk-data";
import { TitledCard } from "../../molecules/TitledCard";

interface FlaggedReasonsProps {
  alasan: RujukanCase["alasan"];
}

export function FlaggedReasons({ alasan }: FlaggedReasonsProps) {
  return (
    <TitledCard title="Kenapa rujukan ini ditandai">
      <ul className="mt-3 divide-y divide-[#EEF1F5]">
        {alasan.map((a) => (
          <li key={a.judul} className="py-3">
            <div className="font-semibold text-sm text-[#0E1B2A]">{a.judul}</div>
            <p className="text-xs text-[#56657A] mt-0.5 leading-relaxed">{a.penjelasan}</p>
          </li>
        ))}
      </ul>
    </TitledCard>
  );
}
