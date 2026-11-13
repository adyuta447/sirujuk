import type { RujukanCase } from "../../../lib/sirujuk-data";

interface ScoreHistoryProps {
  riwayat: NonNullable<RujukanCase["riwayatSkor"]>;
}

export function ScoreHistory({ riwayat }: ScoreHistoryProps) {
  return (
    <ul className="pt-4 space-y-2 text-sm text-[#56657A]">
      {riwayat.map((h) => (
        <li key={h.tanggal} className="flex justify-between gap-4">
          <span>{new Date(h.tanggal).toLocaleString("id-ID")} (model {h.versiModel})</span>
          <span className="font-mono font-bold text-[#0E1B2A]">{h.skor}</span>
        </li>
      ))}
    </ul>
  );
}
