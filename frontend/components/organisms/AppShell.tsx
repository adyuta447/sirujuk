"use client";
import {
  LayoutDashboard,
  Inbox,
  ListChecks,
  ClipboardCheck,
  BarChart3,
  MapPin,
  ChevronDown,
  Menu,
  X,
  Stethoscope,
  MessageSquareText,
  Building2,
  LogOut,
  FilePlus2,
} from "lucide-react";
import { BrandMark } from "../atoms/BrandMark";
import { SearchBar } from "../molecules/SearchBar";
import type { View } from "../../lib/sirujuk-data";
import { periodeSekarang } from "../../lib/formatters";
import { NAMA_PERAN, bolehAkses } from "../../lib/akses";
import type { Peran } from "../../lib/akses";

// Menu yang tidak boleh dibuka peran ini disembunyikan. Penegakan sebenarnya di proxy.ts.
const JALUR: Partial<Record<View, string>> = {
  dashboard: "/dashboard", masuk: "/masuk", queue: "/queue", audit: "/audit", analytics: "/analytics",
  dokter: "/dokter", klarifikasi: "/klarifikasi", dinkes: "/dinkes", skor: "/skor",
};
const boleh = (peran: Peran | undefined, id: View) => !!peran && bolehAkses(peran, JALUR[id] ?? "/");
import { NAVY, WILAYAH } from "../../lib/sirujuk-data";

const NAV: { id: View; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Beranda", Icon: LayoutDashboard },
  { id: "masuk", label: "Rujukan Masuk", Icon: Inbox },
  { id: "queue", label: "Antrean Cek", Icon: ListChecks },
  { id: "audit", label: "Audit", Icon: ClipboardCheck },
  { id: "dokter", label: "Profil Dokter", Icon: Stethoscope },
  { id: "klarifikasi", label: "Klarifikasi", Icon: MessageSquareText },
  { id: "dinkes", label: "Pantauan Wilayah", Icon: Building2 },
  { id: "skor", label: "Skor Rujukan", Icon: FilePlus2 },
  { id: "analytics", label: "Analitik", Icon: BarChart3 },
];

export const Sidebar = ({
  active,
  go,
  onHome,
  peran,
  nama,
  onKeluar,
  open,
  onClose,
}: {
  active: View;
  go: (v: View) => void;
  onHome: () => void;
  peran?: Peran;
  nama?: string;
  onKeluar: () => void;
  open: boolean;
  onClose: () => void;
}) => (
  <>
  <aside
    aria-label="Menu utama"
    onTouchStart={(e) => {
      e.currentTarget.dataset.y = String(e.touches[0].clientY);
    }}
    onTouchEnd={(e) => {
      // tarik ke bawah untuk menutup
      if (e.changedTouches[0].clientY - Number(e.currentTarget.dataset.y) > 80) onClose();
    }}
    className={`w-full lg:w-60 shrink-0 flex flex-col text-white h-screen fixed inset-0 lg:inset-auto lg:sticky lg:top-0 z-40 rounded-none lg:rounded-r-4xl transition-[transform,visibility] duration-300 lg:translate-y-0 lg:visible overscroll-contain ${open ? "translate-y-0 visible" : "translate-y-full invisible"}`}
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
      {NAV.filter((n) => boleh(peran, n.id)).map(({ id, label, Icon }) => {
        const on = active === id;
        return (
          <button
            type="button"
            key={id}
            onClick={() => {
              go(id);
              onClose();
            }}
            aria-current={on ? "page" : undefined}
            className="w-full min-h-14 lg:min-h-11 flex items-center gap-4 lg:gap-3 px-4 lg:px-3 py-2.5 rounded-4xl text-2xl lg:text-sm font-extrabold lg:font-semibold tracking-tight lg:tracking-normal transition-colors text-left"
            style={{
              backgroundColor: on ? "#2C4E78" : "transparent",
              color: on ? "#FFFFFF" : "#D5DFEC",
            }}
            onMouseEnter={(e) => {
              if (!on) e.currentTarget.style.backgroundColor = "#27446B";
            }}
            onMouseLeave={(e) => {
              if (!on) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Icon size={18} className="shrink-0 w-6 h-6 lg:w-[18px] lg:h-[18px]" />
            {label}
          </button>
        );
      })}
    </nav>
    <button
      type="button"
      onClick={onKeluar}
      className="mx-3 mb-2 min-h-11 flex items-center gap-3 px-3 rounded-4xl text-sm font-semibold text-[#D5DFEC] hover:bg-[#27446B]"
    >
      <LogOut aria-hidden="true" size={18} /> Keluar
    </button>
    <div className="px-4 py-4 border-t border-[#2C4E78] flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-4xl flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: "#2C4E78" }}
      >
        {(nama ?? "?").split(" ").map((k) => k[0]).slice(0, 2).join("").toUpperCase()}
      </div>
      <div>
        <div className="text-xs font-semibold text-white">{nama ?? "…"}</div>
        <div className="text-[10px] text-[#C9D6E6]">{peran ? NAMA_PERAN[peran] : ""}</div>
      </div>
    </div>
  </aside>
  </>
);

export const TopBar = ({
  wilayah,
  setWilayah,
  query,
  setQuery,
  onMenu: _onMenu,
}: {
  wilayah: string;
  setWilayah: (w: string) => void;
  query: string;
  setQuery: (q: string) => void;
  onMenu: () => void;
}) => (
  <div className="min-h-16 shrink-0 mx-3 sm:mx-4 mt-3 sm:mt-4 bg-white border border-[#DCE3EC] rounded-4xl flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sticky top-3 sm:top-4 z-20">
    <SearchBar value={query} onChange={setQuery} />
    <div className="sm:ml-auto flex items-center gap-2">
      <MapPin aria-hidden="true" size={15} className="text-[#64748B] hidden sm:block" />
      <div className="relative">
        <select
          aria-label="Pilih wilayah"
          value={wilayah}
          onChange={(e) => setWilayah(e.target.value)}
          className="appearance-none text-sm font-semibold text-[#0E1B2A] bg-[#F4F6F9] rounded-4xl pl-3 pr-8 py-2 min-h-11 border border-transparent hover:border-[#DCE3EC] focus:outline-none focus:border-[#1E3A5F] cursor-pointer"
        >
          {WILAYAH.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
        />
      </div>
    </div>
    <div className="hidden md:block pl-3 ml-1 border-l border-[#DCE3EC] text-right">
      <div className="text-[11px] text-[#64748B]">Periode</div>
      <div className="font-mono text-xs font-semibold text-[#0E1B2A]">
        {periodeSekarang()}
      </div>
    </div>
  </div>
);

const TAB: { id: View; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Beranda", Icon: LayoutDashboard },
  { id: "masuk", label: "Masuk", Icon: Inbox },
  { id: "queue", label: "Antrean", Icon: ListChecks },
  { id: "audit", label: "Audit", Icon: ClipboardCheck },
];

// Navigasi bawah khusus HP: empat halaman utama + tombol menu untuk sisanya.
export const BottomNav = ({
  active,
  go,
  onMenu,
  peran,
}: {
  peran?: Peran;
  active: View;
  go: (v: View) => void;
  onMenu: () => void;
}) => (
  <nav
    aria-label="Navigasi bawah"
    className="lg:hidden fixed bottom-0 inset-x-0 z-20 grid grid-flow-col auto-cols-fr text-white pb-[env(safe-area-inset-bottom)]"
    style={{ backgroundColor: NAVY }}
  >
    {TAB.filter((t) => boleh(peran, t.id)).map(({ id, label, Icon }) => {
      const on = active === id;
      return (
        <button
          type="button"
          key={id}
          onClick={() => go(id)}
          aria-current={on ? "page" : undefined}
          className="min-h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-bold"
          style={{ color: on ? "#FFFFFF" : "#C9D6E6", backgroundColor: on ? "#2C4E78" : NAVY }}
        >
          <Icon aria-hidden="true" size={20} />
          {label}
        </button>
      );
    })}
    <button
      type="button"
      onClick={onMenu}
      className="min-h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-bold"
      style={{ color: "#C9D6E6" }}
    >
      <Menu aria-hidden="true" size={20} />
      Menu
    </button>
  </nav>
);
