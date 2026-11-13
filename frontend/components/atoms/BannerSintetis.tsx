import { Database, FlaskConical } from "lucide-react";

interface BannerSintetisProps {
  sumber?: string;
}

/** Penanda tegas asal data: seed sintetis, atau sampel historis BPJS (nyata, sudah de-identifikasi, bukan rujukan berjalan). */
export function BannerSintetis({ sumber }: BannerSintetisProps) {
  const bpjs = sumber === "bpjs-sampel-2025";
  const Icon = bpjs ? Database : FlaskConical;
  return (
    <p role="note" className="flex items-center gap-2.5 rounded-4xl px-4 py-3 text-sm font-semibold bg-[#9A5A08] text-white">
      <Icon aria-hidden="true" size={18} className="shrink-0" />
      {bpjs
        ? "DATA SAMPEL BPJS Kesehatan 2025: rujukan historis 2024 yang sudah de-identifikasi, bukan rujukan berjalan. Narasi klinis dan SISRUTE tidak ada di data ini."
        : "DATA SINTETIS untuk demo. Bukan data pasien atau rujukan sebenarnya."}
    </p>
  );
}
