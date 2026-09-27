import { Stethoscope } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import {
  IllustrationDone,
  IllustrationTransparent,
} from "../atoms/Illustrations";
import { DOKTER_RISIKO, NAVY, RISK } from "../../lib/sirujuk-data";

export const AnalyticsView = () => (
  <div className="scroll-area flex-1 overflow-y-auto p-6 space-y-5">
    <PageHead
      eyebrow="Biar makin paham"
      title="Analytics"
      sub="Ringkasan pola rujukan dan hal-hal yang mungkin perlu kamu cek."
    />

    <div
      className="rounded-4xl p-6 flex items-center gap-6 text-white"
      style={{ backgroundColor: NAVY }}
    >
      <div className="w-28 h-24 shrink-0 hidden sm:block">
        <IllustrationTransparent />
      </div>
      <div>
        <div className="text-xs font-bold tracking-widest uppercase text-white/50">
          Coba lihat ini
        </div>
        <div className="text-xl font-extrabold mt-1">
          Rujukan tidak wajar naik 18% di Jakarta Utara
        </div>
        <p className="text-sm text-white/70 mt-1">
          Dua puskesmas jadi pemicunya. Yuk, cek polanya dan tentukan langkah
          berikutnya.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { label: "Total rujukan", val: "1.284", sub: "bulan ini" },
        { label: "Perlu kamu cek", val: "186", sub: "14,5% dari total" },
        {
          label: "Sudah ditinjau",
          val: "142",
          sub: "76,3% dari yang ditandai",
        },
        { label: "Berhasil dicegah", val: "38", sub: "rujukan tidak sesuai" },
      ].map((k) => (
        <div
          key={k.label}
          className="bg-white rounded-4xl border border-[#DCE3EC] p-4"
        >
          <div className="text-xs font-semibold text-[#56657A] mb-1">
            {k.label}
          </div>
          <div className="font-mono text-2xl font-bold text-[#0E1B2A]">
            {k.val}
          </div>
          <div className="text-xs text-[#8A98AC] mt-1">{k.sub}</div>
        </div>
      ))}
    </div>

    <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center gap-2">
        <Stethoscope size={16} style={{ color: NAVY }} />
        <div>
          <div className="font-bold text-[#0E1B2A]">
            Pola yang perlu dilihat lagi
          </div>
          <div className="text-xs text-[#56657A] mt-0.5">
            Urut dari yang paling butuh tindak lanjut atau klarifikasi.
          </div>
        </div>
      </div>
      <div className="divide-y divide-[#EEF1F5]">
        {DOKTER_RISIKO.map((d, i) => {
          const high = d.persentase > 25;
          const col = high ? RISK.tinggi : RISK.sedang;
          return (
            <div key={d.nama} className="flex items-start gap-4 px-5 py-4">
              <div
                className="w-7 h-7 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: "#E7ECF3", color: NAVY }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#0E1B2A]">
                    {d.nama}
                  </span>
                  <span className="text-xs text-[#8A98AC]">{d.fktp}</span>
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
                <div className="text-xs text-[#8A98AC]">
                  {d.risikoTinggi} dari {d.totalRujukan}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC]">
          <div className="font-bold text-[#0E1B2A]">
            Rumah sakit yang paling sering dituju
          </div>
          <div className="text-xs text-[#56657A] mt-0.5">
            Kalau rujukan menumpuk di satu tempat, coba cek polanya.
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
        className="rounded-4xl p-5 flex flex-col text-white"
        style={{ backgroundColor: NAVY }}
      >
        <div className="font-extrabold text-lg">        Sebaran risiko</div>
        <div className="text-sm text-white/60">
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
              <div className="font-mono text-sm font-bold">{s.pct}%</div>
              <div
                className="w-full rounded-4xl"
                style={{ height: `${s.h}px`, backgroundColor: s.color }}
              />
              <div className="text-xs text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="bg-white rounded-4xl border border-[#DCE3EC] p-6 flex items-center gap-6">
      <div className="w-40 h-28 shrink-0 hidden sm:block">
        <IllustrationDone />
      </div>
      <div className="flex-1">
        <div className="font-bold text-[#0E1B2A] mb-1">
          Mantap! 142 dari 186 rujukan sudah kamu cek
        </div>
        <p className="text-sm text-[#56657A] max-w-lg leading-relaxed">
          Tinggal 44 rujukan lagi di antrean. Yuk, bereskan pelan-pelan.
        </p>
        <div className="mt-3 max-w-md">
          <div className="h-2 rounded-4xl overflow-hidden bg-[#EEF1F5]">
            <div
              className="h-full rounded-4xl"
              style={{ width: "76.3%", backgroundColor: NAVY }}
            />
          </div>
          <div className="text-xs text-[#8A98AC] mt-1">
            76,3% rujukan sudah beres
          </div>
        </div>
      </div>
    </div>
  </div>
);

// App Root
