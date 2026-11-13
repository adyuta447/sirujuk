import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "../atoms/Card";

interface AccordionSectionProps {
  title: string;
  Icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function AccordionSection({ title, Icon, open, onToggle, children }: AccordionSectionProps) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        className="w-full min-h-11 flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
        onClick={onToggle}
      >
        <Icon aria-hidden="true" size={16} className="text-[#56657A]" />
        <span className="font-bold text-sm text-[#0E1B2A]">{title}</span>
        <ChevronRight
          aria-hidden="true"
          size={16}
          className="ml-auto text-[#56657A] transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-[#EEF1F5]">{children}</div>}
    </Card>
  );
}
