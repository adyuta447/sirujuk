import { BadgeCheck, Cake, HeartPulse, MapPin, Stethoscope } from "lucide-react";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { DetailFact } from "./DetailFact";

interface DetailFactsProps {
  kasus: RujukanCase;
  onDokter: (nama: string) => void;
}

export function DetailFacts({ kasus, onDokter }: DetailFactsProps) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3">
      {kasus.usia ? <DetailFact Icon={Cake} label="Usia">{kasus.usia} tahun</DetailFact> : null}
      {kasus.jenisPeserta ? <DetailFact Icon={BadgeCheck} label="Peserta">{kasus.jenisPeserta}</DetailFact> : null}
      <DetailFact Icon={MapPin} label="Wilayah">{kasus.wilayah}</DetailFact>
      <DetailFact Icon={HeartPulse} label="Diagnosis">{kasus.diagnosa}</DetailFact>
      <DetailFact Icon={Stethoscope} label="Dokter">
        <button type="button" onClick={() => onDokter(kasus.dokter)} className="underline underline-offset-2 text-left">
          {kasus.dokter}
        </button>
      </DetailFact>
    </dl>
  );
}
