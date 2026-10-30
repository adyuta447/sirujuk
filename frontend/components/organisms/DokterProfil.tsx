"use client";

import type { RujukanCase } from "../../lib/sirujuk-data";
import { useDokterProfil } from "../../hooks/useDokterProfil";
import { DoctorDetail } from "./dokter-profil/DoctorDetail";
import { DoctorList } from "./dokter-profil/DoctorList";

interface DokterProfilProps {
  slug?: string;
  onDokter: (nama: string) => void;
  onSelect: (c: RujukanCase) => void;
  onKlarifikasi: (c: RujukanCase) => void;
}

export function DokterProfil({ slug, onDokter, onSelect, onKlarifikasi }: DokterProfilProps) {
  const { daftarDokter, dokter, kasus, prioritas } = useDokterProfil(slug);

  if (!dokter) return <DoctorList daftar={daftarDokter} slugTidakDitemukan={!!slug} onDokter={onDokter} />;
  return (
    <DoctorDetail
      dokter={dokter}
      kasus={kasus}
      prioritas={prioritas}
      onAll={() => onDokter("")}
      onSelect={onSelect}
      onKlarifikasi={onKlarifikasi}
    />
  );
}
