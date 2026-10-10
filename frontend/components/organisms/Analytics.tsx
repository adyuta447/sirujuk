"use client";
import { Stethoscope } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { BannerSintetis } from "../atoms/BannerSintetis";
import { useDokterStats } from "../../hooks/useStats";
import { useReferrals } from "../../hooks/useReferral";
import { ringkas } from "../../lib/ringkasan";
import { NAVY, RISK } from "../../lib/sirujuk-data";
import type { RiskLevel } from "../../lib/sirujuk-data";

const SEBARAN: { level: RiskLevel; label: string }[] = [
  { level: "rendah", label: "Rendah" },
  { level: "sedang", label: "Sedang" },
  { level: "tinggi", label: "Tinggi" },
];

export const AnalyticsView = ({ onDokter }: { onDokter: (nama: string) => void }) => {
  const { data: referrals = [] } = useReferrals();
  const { data: dokterList = [] } = useDokterStats();
  const r = ringkas(referrals);
  return (
  <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
    <PageHead
      title="Analitik"
      art="analitik"
      sub="Pola rujukan dan dokter yang perlu diperhatikan."
    />

    {referrals.some((c) => c.synthetic) && <BannerSintetis />}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Total rujukan", val: r.total, sub: "yang sudah dinilai" },
        { label: "Perlu dicek", val: r.perluDicek, sub: `${r.total ? Math.round((1000 * r.perluDicek) / r.total) / 10 : 0}% dari total` },
        { label: "Sudah dicek", val: r.sudahDicek, sub: "sudah ada hasil audit" },
        { label: "Menunggu", val: r.menunggu, sub: "belum ditinjau" },
      ].map((k) => (
        <div
          key={k.label}
          className="bg-white rounded-4xl border border-[#DCE3EC] p-4"
        >
          <div className="text-xs font-semibold text-[#56657A] mb-1">
            {k.label}
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0E1B2A]">
            {k.val}
          </div>
          <div className="text-xs text-[#64748B] mt-1">{k.sub}</div>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center gap-2">
        <Stethoscope size={16} style={{ color: NAVY }} />
        <div>
          <div className="font-bold text-[#0E1B2A]">
            Dokter dengan pola yang perlu diperiksa
          </div>
          <div className="text-xs text-[#56657A] mt-0.5">
            Diurutkan dari yang paling perlu tindak lanjut.
          </div>
        </div>
      </div>
      <div className="divide-y divide-[#EEF1F5]">
        {dokterList.map((d, i) => {
          const high = d.persentase > 25;
          const col = high ? RISK.tinggi : RISK.sedang;
          return (
            <button
              type="button"
              key={d.nama}
              onClick={() => onDokter(d.nama)}
              className="w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: NAVY, color: "#FFFFFF" }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#0E1B2A]">
                    {d.nama}
                  </span>
                  <span className="text-xs text-[#64748B]">{d.fktp}</span>
                </div>
                <p className="text-xs text-[#56657A] mt-1 leading-relaxed">
                  {d.narasi}
                  {d.darurat > 0 && ` Rujukan darurat: ${d.darurat} (${d.persenDarurat.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%).`}
                </p>
                <div className="mt-2 h-1.5 rounded-4xl overflow-hidden bg-[#EEF1F5] max-w-xs">
                  <div
                    className="h-full rounded-4xl"
                    style={{
                      width: `${d.persentase * 3}%`,
                      backgroundColor: col.solid,
                    }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-mono font-bold text-sm"
                  style={{ color: col.solid }}
                >
                  {d.persentase}%
                </div>
                <div className="text-xs text-[#64748B]">
                  {d.risikoTinggi} dari {d.totalRujukan}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC]">
          <div className="font-bold text-[#0E1B2A]">
            Rumah sakit tujuan terbanyak
          </div>
          <div className="text-xs text-[#56657A] mt-0.5">
            Rujukan yang menumpuk di satu rumah sakit perlu diperiksa.
          </div>
        </div>
        <div className="p-5 space-y-3.5">
          {r.tujuanTerbanyak.map((f) => (
            <div key={f.nama} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#0E1B2A] font-medium truncate mr-2">
                  {f.nama}
                </span>
                <span className="font-mono text-[#1E3A5F] shrink-0">
                  {f.jumlah}
                </span>
              </div>
              <div className="h-2 rounded-4xl overflow-hidden bg-[#EEF1F5]">
                <div
                  className="h-full rounded-4xl"
                  style={{ width: `${f.porsi}%`, backgroundColor: NAVY }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="bg-white rounded-4xl border border-[#DCE3EC] p-5 flex flex-col"
      >
        <div className="font-bold text-[#0E1B2A]">Sebaran risiko</div>
        <div className="text-xs text-[#56657A] mt-0.5">
          Total {r.total} rujukan yang sudah dinilai
        </div>
        <div className="flex-1 flex items-end gap-3 mt-6">
          {SEBARAN.map(({ level, label }) => (
            <div
              key={level}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="font-mono text-sm font-bold text-[#0E1B2A]">{r.sebaran[level]}%</div>
              <div
                className="w-full rounded-4xl"
                style={{ height: `${Math.max(8, r.sebaran[level])}px`, backgroundColor: RISK[level].solid }}
              />
              <div className="text-xs text-[#56657A]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};
