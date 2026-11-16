import type { ReactNode } from "react";

interface SectionLabelProps {
  children: ReactNode;
}

/** Label kecil kapital untuk mengelompokkan blok di sebuah halaman. */
export function SectionLabel({ children }: SectionLabelProps) {
  return <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] pt-1">{children}</div>;
}
