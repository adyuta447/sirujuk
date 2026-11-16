import { ChevronRight } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { Card } from "../../atoms/Card";
import { EmptyState } from "../../atoms/EmptyState";
import { CaseRow } from "../../molecules/CaseRow";


interface HighRiskListProps {
  items: RujukanCase[];
  onSelect: (c: RujukanCase) => void;
  onSeeAll: () => void;
}

export function HighRiskList({ items, onSelect, onSeeAll }: HighRiskListProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center justify-between">
        <div className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">Risiko tinggi</div>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-semibold flex items-center gap-1 min-h-11"
          style={{ color: NAVY }}
        >
          Lihat semua <ChevronRight aria-hidden="true" size={14} />
        </button>
      </div>
      <div className="divide-y divide-[#EEF1F5]">
        {items.length === 0 && <EmptyState embedded art="selesai" title="Tidak ada rujukan berisiko tinggi yang menunggu" />}
        {items.map((c) => (
          <CaseRow key={c.id} kasus={c} onSelect={onSelect} />
        ))}
      </div>
    </Card>
  );
}
