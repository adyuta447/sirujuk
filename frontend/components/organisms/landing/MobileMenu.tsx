import { ArrowRight, X } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";
import { LightButton } from "../../atoms/LightButton";
import { MENU } from "../../../data/landing-menu";

interface MobileMenuProps {
  onClose: () => void;
  onEnter: () => void;
}

export function MobileMenu({ onClose, onEnter }: MobileMenuProps) {
  return (
    <div
      id="menu-mobile"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="md:hidden fixed inset-0 z-50 flex flex-col text-white px-5 pt-5 pb-8"
      style={{ backgroundColor: NAVY }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl font-extrabold tracking-tight">SIRUJUK</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          className="w-12 h-12 flex items-center justify-center rounded-4xl bg-[#2C4E78]"
        >
          <X aria-hidden="true" size={22} />
        </button>
      </div>
      <nav aria-label="Menu" className="flex-1 flex flex-col justify-center">
        {MENU.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            onClick={onClose}
            className="min-h-20 flex items-center justify-between text-4xl font-extrabold tracking-tighter border-b border-[#3A5880] last:border-b-0"
          >
            {label}
            <ArrowRight aria-hidden="true" size={26} />
          </a>
        ))}
      </nav>
      <LightButton onClick={onEnter} className="min-h-14 text-lg font-bold">
        Masuk ke SIRUJUK
      </LightButton>
    </div>
  );
}
