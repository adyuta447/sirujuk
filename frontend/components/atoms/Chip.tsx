import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
}

/** Label kecil netral, mis. spesialisasi. Bukan penanda risiko: warnanya sengaja tidak merah/kuning/hijau. */
export function Chip({ children }: ChipProps) {
  return <span className="inline-block px-2.5 py-1 rounded-4xl text-xs font-semibold bg-[#EEF1F5] text-[#0E1B2A]">{children}</span>;
}
