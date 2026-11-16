import { Check, TriangleAlert } from "lucide-react";
import { HASIL_AKTIVITAS } from "../../../data/hasil-aktivitas";
import { NAMA_PERAN } from "../../../lib/akses";
import type { Peran } from "../../../lib/akses";
import { kalimatAktivitas } from "../../../lib/kalimat-aktivitas";
import { waktuAktivitas } from "../../../lib/waktu-aktivitas";
import type { EntriAktivitas } from "../../../types/activity";
import { Chip } from "../../atoms/Chip";

interface AktivitasRowProps {
  entri: EntriAktivitas;
  /** Tampilkan siapa pelakunya. Hanya berguna bagi yang membaca aktivitas semua orang. */
  tampilkanPelaku: boolean;
}

/** Satu baris log. Semua teks dari server ditampilkan sebagai teks biasa (React meng-escape). */
export function AktivitasRow({ entri: e, tampilkanPelaku }: AktivitasRowProps) {
  const hasil = HASIL_AKTIVITAS[e.outcome];
  const ok = e.outcome === "ok";
  return (
    <li className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_9rem] gap-x-3 sm:gap-x-4 gap-y-1 items-start px-5 py-3.5">
      <span className="w-7 h-7 rounded-4xl flex items-center justify-center text-white" style={{ backgroundColor: hasil.warna }} role="img" aria-label={hasil.label}>
        {ok ? <Check size={15} /> : <TriangleAlert size={15} />}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0E1B2A]">
          {kalimatAktivitas(e)}
          {e.resource_id && <Chip>{e.resource_id.toUpperCase()}</Chip>}
          {!ok && <span className="text-xs font-bold" style={{ color: hasil.warna }}>{hasil.label}</span>}
        </div>
        {tampilkanPelaku && (
          <p className="mt-0.5 text-xs text-[#56657A]">
            {e.actor || "Belum masuk"}
            {e.role ? ` · ${NAMA_PERAN[e.role as Peran] ?? e.role}` : ""}
          </p>
        )}
        {e.detail && e.detail.length > 0 && <p className="mt-0.5 font-mono text-[11px] text-[#64748B] break-words">{e.detail.join(" · ")}</p>}
      </div>
      <div className="col-start-2 sm:col-start-3 font-mono text-xs text-[#64748B] sm:text-right sm:pt-1">{waktuAktivitas(e.at)}</div>
    </li>
  );
}
