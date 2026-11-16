import { HASIL_CEK } from "../../../data/vonis-kesesuaian";
import type { CekKesesuaian } from "../../../types/hospital";

interface FitCheckRowProps {
  cek: CekKesesuaian;
}

export function FitCheckRow({ cek }: FitCheckRowProps) {
  return (
    <li className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
      <div>
        <div className="font-semibold text-[#0E1B2A]">{cek.name}</div>
        <div className="text-xs text-[#56657A] mt-0.5 leading-relaxed">{cek.detail}</div>
      </div>
      <span className="font-mono text-xs font-bold text-[#0E1B2A] shrink-0">{HASIL_CEK[cek.result]}</span>
    </li>
  );
}
