"use client";
import { ChevronRight } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { DINKES_WILAYAH } from "../../lib/sirujuk-data";

export const Dinkes = ({ onWilayah }: { onWilayah: (w: string) => void }) => (
  <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
    <PageHead
      title="Pantauan Wilayah"
      art="dinkes"
      sub="Ringkasan per wilayah tanpa data pasien. Berguna untuk menentukan faskes yang perlu dibina."
    />
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {DINKES_WILAYAH.map((w) => (
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
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 text-xs">
            {[
              ["Faskes", w.faskes],
              ["Rujukan", w.rujukan],
              ["Perlu dicek", `${w.persenTinggi}%`],
              ["Median NS", `${w.medianNS}%`],
              ["Rata-rata HHI", w.hhiRata.toLocaleString("id-ID")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[#56657A]">{k}</dt>
                <dd className="font-mono text-2xl font-extrabold tracking-tight text-[#0E1B2A]">
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
