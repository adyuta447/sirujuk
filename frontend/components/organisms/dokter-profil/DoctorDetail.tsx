import { MessageSquareText } from "lucide-react";
import { RISK } from "../../../lib/sirujuk-data";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import type { DokterStat } from "../../../types/stats";
import { PageHead } from "../../atoms/PageHead";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { KpiCard } from "../../molecules/KpiCard";
import { PageScroll } from "../../molecules/PageScroll";
import { DoctorBreadcrumb } from "./DoctorBreadcrumb";
import { DoctorCases } from "./DoctorCases";

interface DoctorDetailProps {
  dokter: DokterStat;
  kasus: RujukanCase[];
  prioritas?: RujukanCase;
  onAll: () => void;
  onSelect: (c: RujukanCase) => void;
  onKlarifikasi: (c: RujukanCase) => void;
}

export function DoctorDetail({ dokter, kasus, prioritas, onAll, onSelect, onKlarifikasi }: DoctorDetailProps) {
  return (
    <PageScroll>
      <DoctorBreadcrumb nama={dokter.nama} onAll={onAll} />
      <PageHead title={dokter.nama} sub={dokter.narasi} />
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total rujukan" value={dokter.totalRujukan} />
        <KpiCard label="Perlu dicek" value={dokter.risikoTinggi} />
        <KpiCard label="Porsi" value={`${dokter.persentase}%`} />
      </div>
      <p role="note" className="rounded-4xl px-4 py-3 text-xs leading-relaxed bg-white border border-[#DCE3EC] text-[#0E1B2A]">
        Pola ini bisa punya alasan sah, misalnya hanya ada satu rumah sakit yang terjangkau. Karena itu dokter diminta
        klarifikasi dulu sebelum ada tindak lanjut.
      </p>
      <DoctorCases kasus={kasus} onSelect={onSelect} />
      {prioritas && (
        <PrimaryButton onClick={() => onKlarifikasi(prioritas)} className="w-full sm:w-auto px-5 py-3">
          <MessageSquareText size={18} /> Minta klarifikasi ({RISK[prioritas.risk].label})
        </PrimaryButton>
      )}
    </PageScroll>
  );
}
