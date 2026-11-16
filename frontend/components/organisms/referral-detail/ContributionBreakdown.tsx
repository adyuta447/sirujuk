import { RISK } from "../../../lib/sirujuk-data";
import type { RincianSkor, RiskLevel } from "../../../lib/sirujuk-data";
import { ContributionRow } from "./ContributionRow";

interface ContributionBreakdownProps {
  rincian: RincianSkor;
  risk: RiskLevel;
}

/** Kenapa kategori ini, dan faktor mana yang paling menaikkan skor. Semua angka dan kalimat dari backend. */
export function ContributionBreakdown({ rincian, risk }: ContributionBreakdownProps) {
  return (
    <div className="pt-4 space-y-4">
      <p className="text-sm font-semibold text-[#0E1B2A]">{rincian.ringkasan}</p>
      {rincian.faktor.length > 0 && (
        <ul className="space-y-4">
          {rincian.faktor.map((f) => (
            <ContributionRow key={f.layer} faktor={f} dominan={f.layer === rincian.dominan} warna={RISK[risk].solid} />
          ))}
        </ul>
      )}
      <p className="text-xs text-[#56657A] leading-relaxed">
        {rincian.dasar}
        {rincian.sumber === "turunan" && " Rujukan ini dihitung sebelum rincian model tersimpan, jadi porsinya diturunkan dari alasan yang tersimpan."}
      </p>
    </div>
  );
}
