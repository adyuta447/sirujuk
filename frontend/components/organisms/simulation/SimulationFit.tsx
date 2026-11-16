import type { KesesuaianTujuan } from "../../../types/hospital";
import { FitCheckRow } from "../referral-detail/FitCheckRow";
import { FitVerdict } from "../referral-detail/FitVerdict";

interface SimulationFitProps {
  fit: KesesuaianTujuan;
  catatan?: string;
}

export function SimulationFit({ fit, catatan }: SimulationFitProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-[#0E1B2A]">Kesesuaian RS tujuan (asumsi)</p>
      {catatan && <p role="note" className="rounded-4xl px-4 py-3 text-xs leading-relaxed bg-[#1E3A5F] text-white">{catatan}</p>}
      <FitVerdict vonis={fit.verdict} />
      <ul className="space-y-3">
        {fit.checks.map((c) => (
          <FitCheckRow key={c.name} cek={c} />
        ))}
      </ul>
    </div>
  );
}
