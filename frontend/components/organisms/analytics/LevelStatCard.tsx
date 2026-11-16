import type { StatFaskes } from "../../../types/prevention";
import { Card } from "../../atoms/Card";
import { DestinationBar } from "./DestinationBar";

interface LevelStatCardProps {
  title: string;
  rows: StatFaskes[];
}

/** Faskes dengan rujukan kuning atau merah terbanyak. Bar = porsi yang ditandai dari seluruh rujukan faskes itu. */
export function LevelStatCard({ title, rows }: LevelStatCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC]">
        <div className="font-bold text-[#0E1B2A]">{title}</div>
        <div className="text-xs text-[#56657A] mt-0.5">Rujukan kuning atau merah dari seluruh rujukan faskes.</div>
      </div>
      <div className="p-5 space-y-3.5">
        {rows.map((r) => (
          <DestinationBar key={r.id} tujuan={{ nama: r.id, jumlah: `${r.flagged} dari ${r.total}`, porsi: r.flagged_percent }} />
        ))}
      </div>
    </Card>
  );
}
