import type { RujukanCase } from "../../../lib/sirujuk-data";

interface DoctorNarrativeProps {
  kasus: RujukanCase;
}

export function DoctorNarrative({ kasus }: DoctorNarrativeProps) {
  const kosong = kasus.sumber
    ? "Narasi klinis tidak tercatat di data sumber (Data Sampel BPJS)."
    : "Narasi klinis belum diisi dokter.";
  return (
    <p className="pt-4 text-sm text-[#56657A] leading-relaxed whitespace-pre-line">{kasus.narasi || kosong}</p>
  );
}
