import { Stethoscope } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { DOKTER_RISIKO, NAVY, RISK } from "../../lib/sirujuk-data";

export const AnalyticsView = ({ onDokter }: { onDokter: (nama: string) => void }) => (
  <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
    <PageHead
      title="Analitik"
      art="analitik"
      sub="Pola rujukan dan dokter yang perlu diperhatikan."
    />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Total rujukan", val: "1.284", sub: "bulan ini" },
        { label: "Perlu dicek", val: "186", sub: "14,5% dari total" },
        {
          label: "Sudah dicek",
          val: "142",
          sub: "76,3% dari yang ditandai",
        },
        { label: "Terbukti tidak sesuai", val: "38", sub: "rujukan tidak sesuai" },
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
        {DOKTER_RISIKO.map((d, i) => {
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
          {[
            { nama: "RSUP Dr. Cipto Mangunkusumo", jml: 312, pct: 80 },
            { nama: "RS Siloam Kebon Jeruk", jml: 198, pct: 51 },
            { nama: "RS Persahabatan", jml: 155, pct: 40 },
            { nama: "RSCM Kencana", jml: 132, pct: 34 },
          ].map((f) => (
            <div key={f.nama} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#0E1B2A] font-medium truncate mr-2">
                  {f.nama}
                </span>
                <span className="font-mono text-[#1E3A5F] shrink-0">
                  {f.jml}
                </span>
              </div>
              <div className="h-2 rounded-4xl overflow-hidden bg-[#EEF1F5]">
                <div
                  className="h-full rounded-4xl"
                  style={{ width: `${f.pct}%`, backgroundColor: NAVY }}
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
          Agustus 2024, total 1.284 rujukan
        </div>
        <div className="flex-1 flex items-end gap-3 mt-6">
          {[
            { label: "Rendah", pct: 54.3, color: RISK.rendah.solid, h: 100 },
            { label: "Sedang", pct: 31.2, color: RISK.sedang.solid, h: 62 },
            { label: "Tinggi", pct: 14.5, color: RISK.tinggi.solid, h: 34 },
          ].map((s) => (
            <div
              key={s.label}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="font-mono text-sm font-bold text-[#0E1B2A]">{s.pct}%</div>
              <div
                className="w-full rounded-4xl"
                style={{ height: `${s.h}px`, backgroundColor: s.color }}
              />
              <div className="text-xs text-[#56657A]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// App Root
