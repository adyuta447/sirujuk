"use client";

import { useAnalytics } from "../../hooks/useAnalytics";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { ReferralSourceBanner } from "../molecules/ReferralSourceBanner";
import { DoctorRanking } from "./analytics/DoctorRanking";
import { KpiGrid } from "./analytics/KpiGrid";
import { RiskDistribution } from "./analytics/RiskDistribution";
import { TopDestinations } from "./analytics/TopDestinations";

interface AnalyticsViewProps {
  onDokter: (nama: string) => void;
}

export function AnalyticsView({ onDokter }: AnalyticsViewProps) {
  const { referrals, dokterList, ringkasan } = useAnalytics();

  return (
    <PageScroll>
      <PageHead
        title="Analitik"
        art="analitik"
        sub="Pola rujukan dan dokter yang perlu diperhatikan."
      />
      <ReferralSourceBanner referrals={referrals} />
      <KpiGrid ringkasan={ringkasan} />
      <DoctorRanking dokterList={dokterList} onSelect={onDokter} />
      <div className="grid lg:grid-cols-2 gap-4">
        <TopDestinations tujuan={ringkasan.tujuanTerbanyak} />
        <RiskDistribution ringkasan={ringkasan} />
      </div>
    </PageScroll>
  );
}
