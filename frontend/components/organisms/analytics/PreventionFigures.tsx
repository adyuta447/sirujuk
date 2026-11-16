import { bangunKartuPencegahan } from "../../../lib/kartu-pencegahan";
import type { Pencegahan } from "../../../types/prevention";
import { StatCard } from "../../molecules/StatCard";

interface PreventionFiguresProps {
  data: Pencegahan;
}

export function PreventionFigures({ data }: PreventionFiguresProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {bangunKartuPencegahan(data).map((kartu) => (
        <StatCard key={kartu.label} data={kartu} />
      ))}
    </div>
  );
}
