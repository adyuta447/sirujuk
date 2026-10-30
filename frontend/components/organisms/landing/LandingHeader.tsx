import Image from "next/image";
import { Menu, X } from "lucide-react";
import { LandingNav } from "./LandingNav";

interface LandingHeaderProps {
  atas: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEnter: () => void;
  onDaftar: () => void;
}

export function LandingHeader({ atas, menuOpen, onToggleMenu, onEnter, onDaftar }: LandingHeaderProps) {
  const MenuIcon = menuOpen ? X : Menu;
  return (
    <header
      className={`fixed top-0 inset-x-0 z-30 transition-colors duration-300 ${atas ? "bg-transparent" : "bg-white border-b border-[#DCE3EC]"}`}
    >
      <div className="max-w-[75rem] mx-auto flex items-center justify-between gap-4 px-5 md:px-10 h-[4.5rem]">
        <Image
          src="/sirujuk-logo-long.png"
          alt="SIRUJUK Anti Fraud"
          width={829}
          height={274}
          priority
          className="w-auto h-11 transition-[filter] duration-300"
          style={atas ? { filter: "brightness(0) invert(1)" } : undefined}
        />
        <LandingNav atas={atas} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDaftar}
            className={`hidden sm:inline-flex min-h-11 items-center px-4 rounded-4xl text-sm font-bold transition-colors duration-300 ${atas ? "text-white [text-shadow:0_1px_10px_#0E1B2A]" : "text-[#1E3A5F]"}`}
          >
            Daftar
          </button>
          <button
            type="button"
            onClick={onEnter}
            className={`min-h-11 px-6 rounded-4xl text-sm font-bold transition-colors duration-300 ${atas ? "bg-white text-[#1E3A5F] hover:bg-[#E7ECF3]" : "text-white bg-[#1E3A5F] hover:bg-[#16304F]"}`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-4xl bg-[#E7ECF3] text-[#1E3A5F]"
          >
            <MenuIcon aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
