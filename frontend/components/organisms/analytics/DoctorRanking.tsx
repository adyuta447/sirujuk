import { Stethoscope } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";
import type { DokterStat } from "../../../types/stats";
import { Card } from "../../atoms/Card";
import { DoctorRankRow } from "./DoctorRankRow";

interface DoctorRankingProps {
  dokterList: DokterStat[];
  onSelect: (nama: string) => void;
}

export function DoctorRanking({ dokterList, onSelect }: DoctorRankingProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center gap-2">
        <Stethoscope size={16} style={{ color: NAVY }} />
        <div>
          <div className="font-bold text-[#0E1B2A]">Dokter dengan pola yang perlu diperiksa</div>
          <div className="text-xs text-[#56657A] mt-0.5">Diurutkan dari yang paling perlu tindak lanjut.</div>
        </div>
      </div>
      <div className="divide-y divide-[#EEF1F5]">
        {dokterList.map((d, i) => (
          <DoctorRankRow key={d.nama} rank={i + 1} dokter={d} onSelect={onSelect} />
        ))}
      </div>
    </Card>
  );
}
