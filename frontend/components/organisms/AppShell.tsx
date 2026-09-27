"use client";
import {
  LayoutDashboard,
  Inbox,
  ListChecks,
  ClipboardCheck,
  BarChart3,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { SearchBar } from "../molecules/SearchBar";
import type { View } from "../../lib/sirujuk-data";
import { NAVY, WILAYAH } from "../../lib/sirujuk-data";

const NAV: { id: View; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "masuk", label: "Rujukan Masuk", Icon: Inbox },
  { id: "queue", label: "Review Queue", Icon: ListChecks },
  { id: "audit", label: "Audit", Icon: ClipboardCheck },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
];

export const Sidebar = ({
  active,
  go,
  onHome,
}: {
  active: View;
  go: (v: View) => void;
  onHome: () => void;
}) => (
  <aside
    className="w-60 shrink-0 flex flex-col text-white h-screen sticky top-0 rounded-r-4xl"
    style={{ backgroundColor: NAVY }}
  >
    <button
      type="button"
      onClick={onHome}
      aria-label="Kembali ke halaman utama"
      className="px-5 pt-6 pb-5 flex items-center gap-2.5 text-left border-b border-white/10"
    >
      <div
        className="w-9 h-9 rounded-4xl bg-white flex items-center justify-center font-extrabold"
        style={{ color: NAVY }}
      >
        S
      </div>
      <div>
        <div className="font-extrabold leading-none tracking-tight">
          SIRUJUK
        </div>
        <div className="text-[11px] text-white/50 mt-0.5">
          Teman cek rujukan
        </div>
      </div>
    </button>
    <div className="px-5 pt-5 pb-2 text-[11px] font-bold tracking-widest uppercase text-white/40">
      Menu utama
    </div>
    <nav className="flex-1 px-3 space-y-1">
      {NAV.map(({ id, label, Icon }) => {
        const on = active === id;
        return (
          <button
            type="button"
            key={id}
            onClick={() => go(id)}
            aria-current={on ? "page" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-4xl text-sm font-semibold transition-colors text-left"
            style={{
              backgroundColor: on ? "#2C4E78" : "transparent",
              color: on ? "#FFFFFF" : "rgba(255,255,255,0.62)",
            }}
            onMouseEnter={(e) => {
              if (!on) e.currentTarget.style.backgroundColor = "#27446B";
            }}
            onMouseLeave={(e) => {
              if (!on) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </button>
        );
      })}
    </nav>
    <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-4xl flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: "#2C4E78" }}
      >
        AS
      </div>
      <div>
        <div className="text-xs font-semibold text-white">Adit Suryanto</div>
        <div className="text-[10px] text-white/50">Senior verifier</div>
      </div>
    </div>
  </aside>
);

export const TopBar = ({
  wilayah,
  setWilayah,
}: {
  wilayah: string;
  setWilayah: (w: string) => void;
}) => (
  <div className="h-16 shrink-0 mx-4 mt-4 bg-white border border-[#DCE3EC] rounded-4xl flex items-center gap-3 px-6 sticky top-4 z-10">
    <SearchBar />
    <div className="ml-auto flex items-center gap-2">
      <MapPin aria-hidden="true" size={15} className="text-[#8A98AC]" />
      <div className="relative">
        <select
          value={wilayah}
          onChange={(e) => setWilayah(e.target.value)}
          className="appearance-none text-sm font-semibold text-[#0E1B2A] bg-[#F4F6F9] rounded-4xl pl-3 pr-8 py-2 border border-transparent hover:border-[#DCE3EC] focus:outline-none focus:border-[#1E3A5F] cursor-pointer"
        >
          {WILAYAH.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A98AC]"
        />
      </div>
    </div>
    <div className="pl-3 ml-1 border-l border-[#DCE3EC] text-right">
      <div className="text-[11px] text-[#8A98AC]">Lagi lihat periode</div>
      <div className="font-mono text-xs font-semibold text-[#0E1B2A]">
        Agustus 2024
      </div>
    </div>
  </div>
);
