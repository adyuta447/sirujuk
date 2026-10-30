import type { DokterStat } from "../../../types/stats";
import { Card } from "../../atoms/Card";
import { PageHead } from "../../atoms/PageHead";
import { PageScroll } from "../../molecules/PageScroll";
import { DoctorListRow } from "./DoctorListRow";

interface DoctorListProps {
  daftar: DokterStat[];
  slugTidakDitemukan: boolean;
  onDokter: (nama: string) => void;
}

export function DoctorList({ daftar, slugTidakDitemukan, onDokter }: DoctorListProps) {
  return (
    <PageScroll>
      <PageHead
        title="Profil Dokter"
        sub="Pola rujukan tiap dokter dibandingkan dokter sejenis. Untuk menentukan prioritas, bukan vonis."
      />
      {slugTidakDitemukan && (
        <p role="alert" className="text-sm text-[#9B1C1C]">Profil dokter tidak ditemukan. Pilih dari daftar.</p>
      )}
      <Card className="divide-y divide-[#EEF1F5] overflow-hidden">
        {daftar.map((d) => (
          <DoctorListRow key={d.nama} dokter={d} onSelect={onDokter} />
        ))}
      </Card>
    </PageScroll>
  );
}
