import type { RujukanCase } from "../../../lib/sirujuk-data";
import { TitledCard } from "../../molecules/TitledCard";

interface FlaggedReasonsProps {
  alasan: RujukanCase["alasan"];
}

export function FlaggedReasons({ alasan }: FlaggedReasonsProps) {
  return (
    <TitledCard title="Kenapa rujukan ini ditandai">
      <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-4">
        {alasan.map((a) => (
          <div key={a.judul}>
            <div className="font-semibold text-[#0E1B2A]">{a.judul}</div>
            <p className="text-sm text-[#56657A] mt-0.5 leading-relaxed">{a.penjelasan}</p>
          </div>
        ))}
      </div>
    </TitledCard>
  );
}
