import type { LucideIcon } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";

interface BottomNavItemProps {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  /** undefined = tombol aksi biasa (bukan penanda halaman). */
  active?: boolean;
}

export function BottomNavItem({ label, Icon, onClick, active }: BottomNavItemProps) {
  const on = active === true;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className="min-h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-bold"
      style={{ color: on ? "#FFFFFF" : "#C9D6E6", backgroundColor: on ? "#2C4E78" : NAVY }}
    >
      <Icon aria-hidden="true" size={20} />
      {label}
    </button>
  );
}
