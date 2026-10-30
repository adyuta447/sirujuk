"use client";

import { SHORTCUTS } from "../../data/dashboard-shortcuts";
import { periodeSekarang } from "../../lib/formatters";
import { bangunKartuStat } from "../../lib/kartu-stat";
import type { RujukanCase, View } from "../../lib/sirujuk-data";
import { useDashboard } from "../../hooks/useDashboard";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { ReferralSourceBanner } from "../molecules/ReferralSourceBanner";
import { DashboardStats } from "./dashboard/DashboardStats";
import { HighRiskList } from "./dashboard/HighRiskList";
import { PriorityBanner } from "./dashboard/PriorityBanner";
import { ShortcutCard } from "./dashboard/ShortcutCard";

interface DashboardProps {
  go: (v: View) => void;
  onSelect: (c: RujukanCase) => void;
}

export function Dashboard({ go, onSelect }: DashboardProps) {
  const { referrals, isError, isLoading, nama, ringkasan } = useDashboard();

  return (
    <PageScroll spacing="space-y-6">
      <PageHead
        title={`Halo, ${nama ?? "…"}`}
        sub={`Periode ${periodeSekarang()}`}
        art="sapaan"
      />
      <ReferralSourceBanner referrals={referrals} />
      {!isLoading && !isError && ringkasan.total === 0 && (
        <p role="status" className="text-sm text-[#56657A]">
          Belum ada rujukan.
        </p>
      )}
      {isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Ringkasan gagal dimuat. Coba muat ulang halaman.
        </p>
      )}
      <PriorityBanner
        count={ringkasan.tinggi.length}
        onOpenQueue={() => go("queue")}
      />
      <DashboardStats
        cards={bangunKartuStat(ringkasan, isLoading)}
        onNavigate={go}
      />
      <div className="grid xl:grid-cols-[minmax(0,1fr)_21.25rem] gap-6 items-start">
        <HighRiskList
          items={ringkasan.tinggi}
          onSelect={onSelect}
          onSeeAll={() => go("queue")}
        />
        <div className="space-y-4">
          {SHORTCUTS.map((shortcut) => (
            <ShortcutCard
              key={shortcut.judul}
              shortcut={shortcut}
              onClick={() => go(shortcut.to)}
            />
          ))}
        </div>
      </div>
    </PageScroll>
  );
}
