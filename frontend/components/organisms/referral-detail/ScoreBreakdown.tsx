import { DATA_KURANG } from "../../../data/kode-data-kurang";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { IndicatorRow } from "./IndicatorRow";

interface ScoreBreakdownProps {
  kasus: RujukanCase;
}

export function ScoreBreakdown({ kasus }: ScoreBreakdownProps) {
  return (
    <div className="pt-4 space-y-4">
      <p className="text-sm text-[#56657A]">Perbandingan {kasus.dokter} dengan dokter sejenis di wilayah yang sama.</p>
      {kasus.indikator?.map((row) => <IndicatorRow key={row.label} row={row} />)}
      {DATA_KURANG.test(kasus.kodeAlasan ?? "") && (
        <p role="note" className="rounded-4xl px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: "#4B3A8A", color: "#FFFFFF" }}>
          Kualitas data kurang (riwayat dokter belum cukup atau data SISRUTE sudah lama), jadi kepercayaan skor ini lebih rendah.
        </p>
      )}
      <p className="text-xs text-[#56657A]">
        Skor adalah prioritas peninjauan, bukan bukti kecurangan. Keputusan akhir ada pada petugas. Kinerja model baru diukur pada data sintetis.
      </p>
    </div>
  );
}
