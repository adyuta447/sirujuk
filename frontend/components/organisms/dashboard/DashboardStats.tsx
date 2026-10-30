import type { View } from "../../../lib/sirujuk-data";
import { DashboardStatCard } from "./DashboardStatCard";
import type { StatCardData } from "../../../types/dashboard";

interface DashboardStatsProps {
  cards: StatCardData[];
  onNavigate: (v: View) => void;
}

export function DashboardStats({ cards, onNavigate }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <DashboardStatCard key={card.label} data={card} onClick={() => onNavigate(card.to)} />
      ))}
    </div>
  );
}
