import type { RujukanCase } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";
import { CaseRow } from "../../molecules/CaseRow";

interface DoctorCasesProps {
  kasus: RujukanCase[];
  onSelect: (c: RujukanCase) => void;
}

export function DoctorCases({ kasus, onSelect }: DoctorCasesProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC] font-bold text-[#0E1B2A]">Rujukan dari dokter ini</div>
      {kasus.length === 0 && <p className="px-5 py-6 text-sm text-[#56657A]">Belum ada rujukan.</p>}
      <div className="divide-y divide-[#EEF1F5]">
        {kasus.map((c) => (
          <CaseRow key={c.id} kasus={c} onSelect={onSelect} />
        ))}
      </div>
    </Card>
  );
}
