import { formatRupiah } from "../../../lib/formatters";
import type { EstimasiBiaya } from "../../../types/prevention";
import { Card } from "../../atoms/Card";

interface CostEstimateProps {
  biaya: EstimasiBiaya;
}

/** Estimasi potensi efisiensi. Tidak pernah ditulis sebagai penghematan aktual: belum ada data biaya klaim riil. */
export function CostEstimate({ biaya }: CostEstimateProps) {
  const ada = biaya.available && biaya.amount_idr !== undefined;
  return (
    <Card className="p-5">
      <div className="font-bold text-[#0E1B2A]">Estimasi potensi efisiensi biaya</div>
      {ada ? (
        <>
          <p className="font-mono text-3xl font-extrabold tracking-tight text-[#0E1B2A] mt-2">{formatRupiah(biaya.amount_idr ?? 0)}</p>
          <p className="text-xs text-[#56657A] mt-1">Dari kira-kira {biaya.prevented_referrals ?? 0} rujukan yang berpotensi dicegah.</p>
          {biaya.assumptions && (
            <ul className="mt-3 list-disc pl-5 text-xs text-[#56657A] space-y-0.5">
              {biaya.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        // Teks tetap, bukan `reason` dari backend: isinya nama variabel konfigurasi internal.
        <p className="text-sm text-[#56657A] mt-1">Belum dihitung: pemilik sistem belum menetapkan asumsi biaya, dan belum ada data klaim riil.</p>
      )}
    </Card>
  );
}
