"use client";

import type { View } from "../../lib/sirujuk-data";
import { useSirujukPage } from "../../hooks/useSirujukPage";
import { BottomNav } from "../organisms/BottomNav";
import { Landing } from "../organisms/Landing";
import { Sidebar } from "../organisms/Sidebar";
import { TopBar } from "../organisms/TopBar";
import { SirujukView } from "./SirujukView";

interface SirujukPageProps {
  initialView?: View;
  initialId?: string;
}

export function SirujukPage({ initialView = "landing", initialId }: SirujukPageProps) {
  const page = useSirujukPage(initialId);
  const { nav, sesi, filter } = page;

  if (initialView === "landing") return <Landing onEnter={nav.keLogin} onDaftar={nav.keDaftar} />;

  const activeNav: View = initialView === "detail" ? "queue" : initialView;

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <Sidebar
        active={activeNav}
        open={page.menuOpen}
        onClose={() => page.setMenuOpen(false)}
        go={nav.go}
        onHome={nav.keBeranda}
        peran={sesi?.role}
        nama={sesi?.nama}
        onKeluar={nav.keluar}
      />
      <div className="flex-1 min-w-0 w-full max-w-[112rem] mx-auto flex flex-col min-h-screen overflow-hidden pb-16 lg:pb-0">
        <TopBar
          pilihan={page.pilihanWilayah}
          wilayah={filter.wilayah}
          setWilayah={filter.setWilayah}
          query={filter.query}
          setQuery={filter.setQuery}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <SirujukView
            view={initialView}
            id={initialId}
            kasus={page.kasus}
            memuat={page.memuatRujukan}
            nav={nav}
            wilayah={filter.wilayah}
            query={filter.query}
            onWilayah={filter.setWilayah}
          />
        </main>
      </div>
      <BottomNav active={activeNav} go={nav.go} peran={sesi?.role} onMenu={() => page.setMenuOpen(true)} />
    </div>
  );
}
