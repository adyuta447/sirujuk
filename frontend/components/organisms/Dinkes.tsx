"use client";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { BannerSintetis } from "../atoms/BannerSintetis";
import { useStatsSintetis, useWilayahStats } from "../../hooks/useStats";

const persen = (v: number | null) => (v === null ? "-" : `${v}%`);

/** Lebar meter 0-100 dari persen apa adanya, tanpa ambang warna: perbandingan netral. */
const lebarMeter = (v: number) => `${Math.min(100, Math.max(0, v))}%`;

export const Dinkes = ({ onWilayah }: { onWilayah: (w: string) => void }) => {
  const { data: wilayah = [], isError, isLoading, refetch } = useWilayahStats();
  const { data: sintetis } = useStatsSintetis();
  // Tugas layar ini menemukan wilayah yang perlu dibina, jadi yang angkanya tertinggi tampil pertama.
  const terurut = useMemo(() => wilayah.slice().sort((a, b) => b.persenTinggi - a.persenTinggi), [wilayah]);
  return (
  <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
    <PageHead
      title="Pantauan Wilayah"
      art="dinkes"
      sub="Ringkasan per wilayah tanpa data pasien, untuk menentukan faskes yang perlu dibina."
    />
    {sintetis && <BannerSintetis />}
    {isLoading && <p role="status" className="text-sm text-[#56657A]">Memuat data wilayah…</p>}
    {isError && (
      <div role="alert" className="bg-white rounded-4xl border border-[#DCE3EC] px-5 py-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-[#9B1C1C] flex-1 min-w-52">
          Data wilayah tidak bisa dimuat.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-11 px-5 py-2 text-sm font-semibold text-white bg-[#1E3A5F] rounded-4xl hover:bg-[#16304F] transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )}
    {!isLoading && !isError && wilayah.length === 0 && <p className="text-sm text-[#56657A]">Belum ada rujukan yang dinilai. Rujukan yang sudah dinilai akan muncul di sini per wilayah.</p>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {terurut.map((w) => (
        <button
          type="button"
          key={w.wilayah}
          onClick={() => onWilayah(w.wilayah)}
          className="text-left bg-white rounded-4xl border border-[#DCE3EC] p-5 hover:border-[#1E3A5F] transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">
              {w.wilayah}
            </span>
            <ChevronRight
              aria-hidden="true"
              size={16}
              className="text-[#64748B]"
            />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-[#56657A]">Perlu dicek</span>
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-[#0E1B2A]">
                {w.persenTinggi}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-[#EEF1F5]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#1E3A5F]" style={{ width: lebarMeter(w.persenTinggi) }} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-[#EEF1F5] text-xs">
            {[
              ["Rujukan", w.rujukan],
              ["Faskes", w.faskes],
              ["Median NS", persen(w.medianNS)],
              ["Rata-rata HHI", w.hhiRata === null ? "-" : w.hhiRata.toLocaleString("id-ID")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[#56657A]">{k}</dt>
                <dd className="text-lg font-bold tabular-nums text-[#0E1B2A]">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 text-xs font-semibold text-[#1E3A5F]">
            Lihat antrean wilayah ini
          </div>
        </button>
      ))}
    </div>
  </div>
  );
};
