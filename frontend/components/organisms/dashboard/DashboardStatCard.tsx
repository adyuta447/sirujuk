import type { StatCardData } from "../../../types/dashboard";
import { StatCard } from "../../molecules/StatCard";

interface DashboardStatCardProps {
  data: StatCardData;
  onClick: () => void;
}

export function DashboardStatCard({ data, onClick }: DashboardStatCardProps) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <StatCard data={data} className="h-full hover:border-[#1E3A5F] transition-colors" />
    </button>
  );
}
