import { formatRupiah } from "../../../lib/formatters";
import type { EstimasiBiaya } from "../../../types/prevention";

interface CostEstimateProps {
  biaya: EstimasiBiaya;
}

/** Estimasi potensi efisiensi. Tidak pernah ditulis sebagai penghematan aktual: belum ada data biaya klaim riil. */
export function CostEstimate({ biaya }: CostEstimateProps) {
  return (
    <div className="rounded-4xl border border-[#DCE3EC] bg-[#F4F6F9] p-4 space-y-2">
      <div className="text-sm font-bold text-[#0E1B2A]">Estimasi potensi efisiensi biaya</div>
      {biaya.available && biaya.amount_idr !== undefined ? (
        <>
          <p className="font-mono text-2xl font-extrabold text-[#0E1B2A]">{formatRupiah(biaya.amount_idr)}</p>
          <p className="text-xs text-[#56657A]">Dari kira-kira {biaya.prevented_referrals ?? 0} rujukan yang berpotensi dicegah.</p>
          {biaya.assumptions && (
            <ul className="list-disc pl-5 text-xs text-[#56657A] space-y-0.5">
              {biaya.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-[#56657A]">Belum dihitung{biaya.reason ? `: ${biaya.reason}` : "."}</p>
      )}
      <p className="text-xs font-semibold text-[#9A5A08]">{biaya.disclaimer}</p>
    </div>
  );
}
