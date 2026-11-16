import { HASIL_CEK, WARNA_CEK } from "../../../data/vonis-kesesuaian";
import type { CekKesesuaian } from "../../../types/hospital";

interface FitCheckRowProps {
  cek: CekKesesuaian;
}

/** Baris pemeriksaan: sama bentuknya dengan IndicatorRow di Rincian Skor. */
export function FitCheckRow({ cek }: FitCheckRowProps) {
  return (
    <li className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
      <div>
        <div className="font-semibold text-[#0E1B2A]">{cek.name}</div>
        <div className="text-xs text-[#56657A] mt-0.5 leading-relaxed">{cek.detail}</div>
      </div>
      <span className="font-mono font-bold sm:text-right shrink-0" style={{ color: WARNA_CEK[cek.result] }}>
        {HASIL_CEK[cek.result]}
      </span>
    </li>
  );
}
