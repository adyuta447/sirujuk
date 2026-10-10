"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useReferrals } from "../../hooks/useReferral";
import { useSession } from "../../hooks/useSession";
import { AnalyticsView } from "../organisms/Analytics";
import { BottomNav, Sidebar, TopBar } from "../organisms/AppShell";
import { AuditView } from "../organisms/AuditWorkspace";
import { Dashboard } from "../organisms/Dashboard";
import { Dinkes } from "../organisms/Dinkes";
import { DokterProfil } from "../organisms/DokterProfil";
import { Klarifikasi } from "../organisms/Klarifikasi";
import { Landing } from "../organisms/Landing";
import { ReferralDetail } from "../organisms/ReferralDetail";
import { RujukanMasuk } from "../organisms/ReferralList";
import { QueueView } from "../organisms/ReviewQueue";
import { SkorBaru } from "../organisms/SkorBaru";
import { useFilterStore } from "../../store/useFilterStore";
import { slugDokter } from "../../lib/sirujuk-data";
import type { RujukanCase, View } from "../../lib/sirujuk-data";

const PATHS: Partial<Record<View, string>> = {
  dashboard: "/dashboard",
  masuk: "/masuk",
  queue: "/queue",
  audit: "/audit",
  analytics: "/analytics",
  dokter: "/dokter",
  klarifikasi: "/klarifikasi",
  dinkes: "/dinkes",
  skor: "/skor",
};

export default function SirujukPage({
  initialView = "landing",
  initialId,
}: {
  initialView?: View;
  initialId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sesi } = useSession();
  const { wilayah, setWilayah, query, setQuery } = useFilterStore();
  const [menuOpen, setMenuOpen] = useState(false);
  // Konteks halaman dibaca dari URL (initialId), jadi tombol back dan refresh tetap jalan.
  // Hanya data dari backend.
  const { data: daftar = [], isLoading: memuatDaftar } = useReferrals();
  const kasus = daftar.find((c) => c.id === initialId) ?? null;

  if (initialView === "landing") {
    return <Landing onEnter={() => router.push("/login")} onDaftar={() => router.push("/daftar")} />;
  }

  const keluar = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };
  const go = (v: View) => router.push(PATHS[v] ?? "/dashboard");
  const lihatDetail = (c: RujukanCase) => router.push(`/referral/${c.id}`);
  const mulaiAudit = (c: RujukanCase) => router.push(`/audit/${c.id}`);
  const keKlarifikasi = (c: RujukanCase) => router.push(`/klarifikasi/${c.id}`);
  const keDokter = (nama: string) =>
    router.push(nama ? `/dokter/${slugDokter(nama)}` : "/dokter");
  const keAntrean = () => router.push("/queue");

  const activeNav: View = initialView === "detail" ? "queue" : initialView;

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <Sidebar
        active={activeNav}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        go={go}
        onHome={() => router.push("/")}
        peran={sesi?.role}
        nama={sesi?.nama}
        onKeluar={keluar}
      />
      <div className="flex-1 min-w-0 w-full max-w-[112rem] mx-auto flex flex-col min-h-screen overflow-hidden pb-16 lg:pb-0">
        <TopBar
          wilayah={wilayah}
          setWilayah={setWilayah}
          query={query}
          setQuery={setQuery}
          onMenu={() => setMenuOpen(true)}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          {initialView === "dashboard" && <Dashboard go={go} onSelect={lihatDetail} />}
          {initialView === "masuk" && (
            <RujukanMasuk onSelect={lihatDetail} wilayah={wilayah} query={query} />
          )}
          {initialView === "queue" && (
            <QueueView onSelect={lihatDetail} wilayah={wilayah} query={query} />
          )}
          {initialView === "detail" &&
            (kasus ? (
              <ReferralDetail
                kasus={kasus}
                onBack={keAntrean}
                onAudit={mulaiAudit}
                onDokter={keDokter}
                onKlarifikasi={keKlarifikasi}
              />
            ) : memuatDaftar ? (
              <p role="status" className="p-6 text-sm text-[#56657A]">Memuat rujukan…</p>
            ) : (
              <p role="alert" className="p-6 text-sm text-[#9B1C1C]">
                Rujukan tidak ditemukan. Kembali ke antrean.
              </p>
            ))}
          {initialView === "audit" && (
            <AuditView
              kasus={kasus}
              onDone={keAntrean}
              onSelect={mulaiAudit}
              onKlarifikasi={keKlarifikasi}
            />
          )}
          {initialView === "analytics" && <AnalyticsView onDokter={keDokter} />}
          {initialView === "dokter" && (
            <DokterProfil
              slug={initialId}
              onDokter={keDokter}
              onSelect={lihatDetail}
              onKlarifikasi={keKlarifikasi}
            />
          )}
          {initialView === "klarifikasi" && (
            <Klarifikasi
              kasus={kasus ?? undefined}
              onPilih={keKlarifikasi}
              onDetail={lihatDetail}
              onDokter={keDokter}
            />
          )}
          {initialView === "skor" && <SkorBaru />}
          {initialView === "dinkes" && (
            <Dinkes
              onWilayah={(w) => {
                setWilayah(w);
                keAntrean();
              }}
            />
          )}
        </main>
      </div>
      <BottomNav active={activeNav} go={go} peran={sesi?.role} onMenu={() => setMenuOpen(true)} />
    </div>
  );
}
