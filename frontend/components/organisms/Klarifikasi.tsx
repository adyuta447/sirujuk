"use client";

import type { RujukanCase } from "../../lib/sirujuk-data";
import { ClarificationCase } from "./klarifikasi/ClarificationCase";
import { ClarificationPicker } from "./klarifikasi/ClarificationPicker";

interface KlarifikasiProps {
  kasus?: RujukanCase;
  onPilih: (c: RujukanCase) => void;
  onDetail: (c: RujukanCase) => void;
  onDokter: (nama: string) => void;
}

// Tampilan untuk dokter FKTP: mobile first, nadanya sopan dan tidak menuduh.
export function Klarifikasi({
  kasus,
  onPilih,
  onDetail,
  onDokter,
}: KlarifikasiProps) {
  if (!kasus) return <ClarificationPicker onPilih={onPilih} />;
  return (
    <ClarificationCase kasus={kasus} onDetail={onDetail} onDokter={onDokter} />
  );
}
