import type { RiskLevel } from "../../../lib/sirujuk-data";
import type { RiskDecision } from "../../../types/referral";
import { Card } from "../../atoms/Card";
import { ScoreResultBody } from "./ScoreResultBody";
import { ScoreResultError } from "./ScoreResultError";

interface ScoreResultProps {
  data?: RiskDecision;
  error: Error | null;
  isPending: boolean;
  level: RiskLevel | null;
  onReset: () => void;
}

export function ScoreResult({
  data,
  error,
  isPending,
  level,
  onReset,
}: ScoreResultProps) {
  return (
    <Card as="section" className="p-5 lg:sticky lg:top-0">
      <h2 className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">
        Hasil
      </h2>
      {!data && !error && !isPending && (
        <p className="text-sm text-[#56657A] mt-2">
          Hasil skor akan muncul di sini.
        </p>
      )}
      {isPending && (
        <p className="text-sm text-[#56657A] mt-2">Lagi dihitung…</p>
      )}
      {error && <ScoreResultError message={error.message} onClose={onReset} />}
      {data?.status === "ACCEPTED_ASYNC" && (
        <p className="text-sm text-[#56657A] mt-2">
          Skor belum tersedia. Rujukan tetap berjalan dan dinilai menyusul.
          Tidak ada rujukan yang ditahan karena hal ini.
        </p>
      )}
      {data && level && <ScoreResultBody data={data} level={level} />}
    </Card>
  );
}
