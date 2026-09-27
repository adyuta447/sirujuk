"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsView } from "../organisms/Analytics";
import { Sidebar, TopBar } from "../organisms/AppShell";
import { AuditView } from "../organisms/AuditWorkspace";
import { Dashboard } from "../organisms/Dashboard";
import { Landing } from "../organisms/Landing";
import { ReferralDetail } from "../organisms/ReferralDetail";
import { RujukanMasuk } from "../organisms/ReferralList";
import { QueueView } from "../organisms/ReviewQueue";
import type { RujukanCase, View } from "../../lib/sirujuk-data";

export default function SirujukPage({
  initialView = "landing",
}: {
  initialView?: View;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [selectedCase, setSelectedCase] = useState<RujukanCase | null>(null);
  const [auditCase, setAuditCase] = useState<RujukanCase | null>(null);
  const [wilayah, setWilayah] = useState("Semua Wilayah");

  if (view === "landing") {
    return (
      <Landing
        onEnter={() => {
          setView("dashboard");
          router.push("/dashboard");
        }}
      />
    );
  }

  const paths: Partial<Record<View, string>> = {
    dashboard: "/dashboard",
    masuk: "/masuk",
    queue: "/queue",
    audit: "/audit",
    analytics: "/analytics",
  };

  const go = (nextView: View) => {
    setView(nextView);
    setSelectedCase(null);
    if (nextView !== "audit") setAuditCase(null);
    if (paths[nextView]) router.push(paths[nextView]);
  };

  const selectCase = (item: RujukanCase) => {
    setSelectedCase(item);
    setView("detail");
  };

  const startAudit = (item: RujukanCase) => {
    setAuditCase(item);
    setView("audit");
  };

  const backToQueue = () => {
    setSelectedCase(null);
    setView("queue");
    router.push("/queue");
  };

  const auditDone = () => {
    setAuditCase(null);
    setSelectedCase(null);
    setView("queue");
    router.push("/queue");
  };

  const activeNav: View = view === "detail" ? "queue" : view;

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <Sidebar
        active={activeNav}
        go={go}
        onHome={() => {
          setView("landing");
          router.push("/");
        }}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopBar wilayah={wilayah} setWilayah={setWilayah} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {view === "dashboard" && <Dashboard go={go} onSelect={selectCase} />}
          {view === "masuk" && (
            <RujukanMasuk onSelect={selectCase} wilayah={wilayah} />
          )}
          {view === "queue" && (
            <QueueView onSelect={selectCase} wilayah={wilayah} />
          )}
          {view === "detail" && selectedCase && (
            <ReferralDetail
              kasus={selectedCase}
              onBack={backToQueue}
              onAudit={startAudit}
            />
          )}
          {view === "audit" && (
            <AuditView
              kasus={auditCase}
              onDone={auditDone}
              onSelect={startAudit}
            />
          )}
          {view === "analytics" && <AnalyticsView />}
        </main>
      </div>
    </div>
  );
}
