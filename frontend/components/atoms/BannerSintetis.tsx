import { Database, FlaskConical } from "lucide-react";
import { NoticeBanner } from "./NoticeBanner";

interface BannerSintetisProps {
  sumber?: string;
}

/** Penanda tegas asal data: seed sintetis, atau sampel historis BPJS (nyata, sudah de-identifikasi, bukan rujukan berjalan). */
export function BannerSintetis({ sumber }: BannerSintetisProps) {
  const bpjs = sumber === "bpjs-sampel-2025";
  return (
    <NoticeBanner Icon={bpjs ? Database : FlaskConical}>
      {bpjs
        ? "DATA SAMPEL BPJS Kesehatan 2025: rujukan historis 2024 yang sudah de-identifikasi, bukan rujukan berjalan. Narasi klinis dan SISRUTE tidak ada di data ini."
        : "DATA SINTETIS untuk demo. Bukan data pasien atau rujukan sebenarnya."}
    </NoticeBanner>
  );
}
