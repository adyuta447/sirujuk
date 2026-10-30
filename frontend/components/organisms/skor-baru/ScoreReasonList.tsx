import { KODE_ALASAN } from "../../../lib/alasan-skor";

interface ScoreReasonListProps {
  reasons: { code: string; detail: string }[];
}

export function ScoreReasonList({ reasons }: ScoreReasonListProps) {
  return (
    <ul className="space-y-3">
      {reasons.map((r) => (
        <li key={r.code}>
          <p className="font-semibold text-[#0E1B2A]">{KODE_ALASAN[r.code] ?? r.code}</p>
          <p className="text-sm text-[#56657A] mt-0.5">{r.detail}</p>
        </li>
      ))}
    </ul>
  );
}
