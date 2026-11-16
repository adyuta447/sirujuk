import type { RincianSkor } from "../../../lib/sirujuk-data";

interface DominantFactorProps {
  rincian?: RincianSkor;
}

export function DominantFactor({ rincian }: DominantFactorProps) {
  const utama = rincian?.faktor[0];
  if (!utama) return null;
  return (
    <p className="text-xs text-[#56657A] mt-2">
      Faktor terbesar: <span className="font-semibold text-[#0E1B2A]">{utama.label}</span> ({utama.persen}%)
    </p>
  );
}
