"use client";

import { LogOut, X } from "lucide-react";
import type { Peran } from "../../lib/akses";
import { bolehMenu } from "../../lib/navigation";
import { NAVY } from "../../lib/sirujuk-data";
import type { View } from "../../lib/sirujuk-data";
import { useSwipeDown } from "../../hooks/useSwipeDown";
import { BrandMark } from "../atoms/BrandMark";
import { NAV } from "../../data/nav-items";
import { SidebarNavItem } from "./app-shell/SidebarNavItem";
import { SidebarProfile } from "./app-shell/SidebarProfile";

interface SidebarProps {
  active: View;
  go: (v: View) => void;
  onHome: () => void;
  peran?: Peran;
  nama?: string;
  onKeluar: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  active,
  go,
  onHome,
  peran,
  nama,
  onKeluar,
  open,
  onClose,
}: SidebarProps) {
  const swipe = useSwipeDown(onClose);
  const visibility = open
    ? "translate-y-0 visible"
    : "translate-y-full invisible";

  return (
    <aside
      aria-label="Menu utama"
      {...swipe}
      className={`w-full lg:w-60 shrink-0 flex flex-col text-white h-screen fixed inset-0 lg:inset-auto lg:sticky lg:top-0 z-40 rounded-none lg:rounded-r-4xl transition-[transform,visibility] duration-300 lg:translate-y-0 lg:visible overscroll-contain ${visibility}`}
      style={{ backgroundColor: NAVY }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup menu"
        className="lg:hidden absolute top-5 right-5 w-12 h-12 flex items-center justify-center rounded-4xl text-[#0E1B2A] hover:bg-[#EEF1F5]"
      >
        <X size={18} />
      </button>
      <button
        type="button"
        onClick={onHome}
        aria-label="Kembali ke halaman utama"
        className="bg-[#F8FAFC] px-5 pt-6 pb-6 pr-20 lg:pr-5 flex items-center text-left rounded-tr-3xl"
      >
        <BrandMark variant="light" shield={64} />
      </button>
      <div className="px-5 pt-5 pb-2 text-[11px] font-bold tracking-widest uppercase text-[#C9D6E6]">
        Menu utama
      </div>
      <nav className="flex-1 px-4 lg:px-3 space-y-1 overflow-y-auto">
        {NAV.filter((n) => bolehMenu(peran, n.id)).map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => {
              go(item.id);
              onClose();
            }}
          />
        ))}
      </nav>
      <button
        type="button"
        onClick={onKeluar}
        className="mx-3 mb-2 min-h-11 flex items-center gap-3 px-3 rounded-4xl text-sm font-semibold text-[#D5DFEC] hover:bg-[#27446B]"
      >
        <LogOut aria-hidden="true" size={18} /> Keluar
      </button>
      <SidebarProfile nama={nama} peran={peran} />
    </aside>
  );
}
