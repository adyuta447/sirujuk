import { TriangleAlert } from "lucide-react";
import { RISK } from "../../../lib/sirujuk-data";

export function ScoreDisclaimer() {
  return (
    <div
      className="rounded-4xl px-4 py-3 flex items-start gap-2.5 text-sm"
      style={{ backgroundColor: RISK.sedang.solid, color: "#FFFFFF" }}
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
      <span>
        <span className="font-bold">Skor hanya menunjukkan prioritas.</span>{" "}
        Keputusan akhir ada pada kamu, bukan pada skor.
      </span>
    </div>
  );
}
