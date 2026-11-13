import type { NavItem } from "../../../types/nav";

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

export function SidebarNavItem({ item: { label, Icon }, active, onClick }: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="w-full min-h-14 lg:min-h-11 flex items-center gap-4 lg:gap-3 px-4 lg:px-3 py-2.5 rounded-4xl text-2xl lg:text-sm font-extrabold lg:font-semibold tracking-tight lg:tracking-normal transition-colors text-left"
      style={{ backgroundColor: active ? "#2C4E78" : "transparent", color: active ? "#FFFFFF" : "#D5DFEC" }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "#27446B";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <Icon size={18} className="shrink-0 w-6 h-6 lg:w-[18px] lg:h-[18px]" />
      {label}
    </button>
  );
}
