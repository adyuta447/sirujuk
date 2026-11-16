import { Check, TriangleAlert } from "lucide-react";
import { waktuAktivitas } from "../../../lib/waktu-aktivitas";
import type { Aktivitas } from "../../../types/aktivitas";
import { Chip } from "../../atoms/Chip";

interface AktivitasRowProps {
  aktivitas: Aktivitas;
}

/** Satu baris: ikon hasil (hijau atau merah, dengan bentuk yang berbeda), apa yang terjadi, dan kapan. */
export function AktivitasRow({ aktivitas: a }: AktivitasRowProps) {
  const berhasil = a.jenis === "berhasil";
  return (
    <li className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_9rem] gap-x-3 sm:gap-x-4 gap-y-1 items-start px-5 py-3.5">
      <span
        className="w-7 h-7 rounded-4xl flex items-center justify-center text-white"
        style={{ backgroundColor: berhasil ? "#17803F" : "#C42222" }}
        role="img"
        aria-label={berhasil ? "Berhasil" : "Gagal"}
      >
        {berhasil ? <Check size={15} /> : <TriangleAlert size={15} />}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0E1B2A]">
          {a.judul}
          {a.konteks && <Chip>{a.konteks}</Chip>}
        </div>
        {a.pesan && <p className="mt-0.5 text-xs text-[#56657A] leading-relaxed">{a.pesan}</p>}
      </div>
      <div className="col-start-2 sm:col-start-3 font-mono text-xs text-[#64748B] sm:text-right sm:pt-1">{waktuAktivitas(a.waktu)}</div>
    </li>
  );
}
