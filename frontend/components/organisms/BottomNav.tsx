import { Menu } from "lucide-react";
import type { Peran } from "../../lib/akses";
import { bolehMenu } from "../../lib/navigation";
import { NAVY } from "../../lib/sirujuk-data";
import type { View } from "../../lib/sirujuk-data";
import { BottomNavItem } from "./app-shell/BottomNavItem";
import { TAB } from "../../data/tab-items";

interface BottomNavProps {
  active: View;
  go: (v: View) => void;
  onMenu: () => void;
  peran?: Peran;
}

export function BottomNav({ active, go, onMenu, peran }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigasi bawah"
      className="lg:hidden fixed bottom-0 inset-x-0 z-20 grid grid-flow-col auto-cols-fr text-white pb-[env(safe-area-inset-bottom)]"
      style={{ backgroundColor: NAVY }}
    >
      {TAB.filter((t) => bolehMenu(peran, t.id)).map(({ id, label, Icon }) => (
        <BottomNavItem
          key={id}
          label={label}
          Icon={Icon}
          active={active === id}
          onClick={() => go(id)}
        />
      ))}
      <BottomNavItem label="Menu" Icon={Menu} onClick={onMenu} />
    </nav>
  );
}
