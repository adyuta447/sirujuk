import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface DetailFactProps {
  Icon: LucideIcon;
  label: string;
  children: ReactNode;
}

export function DetailFact({ Icon, label, children }: DetailFactProps) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Icon aria-hidden="true" size={34} strokeWidth={1.6} className="shrink-0 text-[#C9D6E6]" />
      <div className="min-w-0">
        <dt className="text-[11px] text-[#C9D6E6]">{label}</dt>
        <dd className="text-sm font-bold leading-tight">{children}</dd>
      </div>
    </div>
  );
}
