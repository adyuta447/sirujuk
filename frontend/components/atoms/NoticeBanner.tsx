import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface NoticeBannerProps {
  Icon: LucideIcon;
  children: ReactNode;
}

/** Penanda tegas berlatar amber solid: asal data atau status khusus halaman. Ikon + teks. */
export function NoticeBanner({ Icon, children }: NoticeBannerProps) {
  return (
    <p role="note" className="flex items-center gap-2.5 rounded-4xl px-4 py-3 text-sm font-semibold bg-[#9A5A08] text-white">
      <Icon aria-hidden="true" size={18} className="shrink-0" />
      {children}
    </p>
  );
}
