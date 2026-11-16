import { KATEGORI_RISIKO } from "../../../data/kategori-risiko";
import { RiskBadge } from "../../atoms/RiskBadge";
import type { DampakRisiko } from "../../../types/risk-config";

interface ImpactPreviewProps {
  dampak: DampakRisiko;
}

export function ImpactPreview({ dampak }: ImpactPreviewProps) {
  return (
    <div role="status" className="rounded-4xl border border-[#DCE3EC] bg-[#F4F6F9] p-4 space-y-3">
      <p className="text-sm font-bold text-[#0E1B2A]">
        Dampak pada {dampak.total} rujukan yang sudah dinilai model: {dampak.changed} berpindah kategori.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[#56657A]">
            <th className="font-semibold py-1 pr-4">Kategori</th>
            <th className="font-semibold py-1">Sekarang</th>
            <th className="font-semibold py-1">Usulan</th>
          </tr>
        </thead>
        <tbody>
          {KATEGORI_RISIKO.map((k) => (
            <tr key={k.key} className="border-t border-[#DCE3EC]">
              <td className="py-1.5 pr-4 w-44"><RiskBadge level={k.level} className="w-full justify-center" /></td>
              <td className="py-1.5 font-mono">{dampak.current[k.key]}</td>
              <td className="py-1.5 font-mono font-bold">{dampak.proposed[k.key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-[#56657A] leading-relaxed">{dampak.note}</p>
    </div>
  );
}
