import { FlaskConical } from "lucide-react";

/** Penanda tegas: angka dan baris di halaman ini berasal dari seed demo, bukan pasien sungguhan. */
export function BannerSintetis() {
  return (
    <p role="note" className="flex items-center gap-2.5 rounded-4xl px-4 py-3 text-sm font-semibold bg-[#9A5A08] text-white">
      <FlaskConical aria-hidden="true" size={18} className="shrink-0" />
      DATA SINTETIS untuk demo. Bukan data pasien atau rujukan sebenarnya.
    </p>
  );
}
