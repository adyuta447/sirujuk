"use client";
import {
  Inbox,
  TriangleAlert,
  ListChecks,
  Check,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { BannerSintetis } from "../atoms/BannerSintetis";
import { Illustration } from "../atoms/Illustration";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { RiskBadge } from "../atoms/RiskBadge";
import type { RujukanCase, View } from "../../lib/sirujuk-data";
import { NAVY } from "../../lib/sirujuk-data";
import { cocokCari, tampilPasien } from "../../lib/formatters";
import { useReferrals } from "../../hooks/useReferral";
import { useSession } from "../../hooks/useSession";
import { periodeSekarang } from "../../lib/formatters";

export const Dashboard = ({
  go,
  onSelect,
}: {
  go: (v: View) => void;
  onSelect: (c: RujukanCase) => void;
}) => {
  const { data: referrals = [], isError, isLoading } = useReferrals();
  const { data: sesi } = useSession();
  const total = referrals.length;
  const perluDicek = referrals.filter((c) => c.risk !== "rendah").length;
  const menunggu = referrals.filter((c) => c.risk !== "rendah" && c.status !== "selesai").length;
  const selesai = referrals.filter((c) => c.risk !== "rendah" && c.status === "selesai").length;
  const persen = (a: number, b: number) => (b === 0 ? "0%" : `${((a / b) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);
  const tinggi = referrals.filter(
    (c) => c.risk === "tinggi" && c.status !== "selesai",
  );
  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <PageHead title={`Halo, ${sesi?.nama ?? "…"}`} sub={`Periode ${periodeSekarang()}`} art="sapaan" />
      {referrals.some((c) => c.synthetic) && <BannerSintetis />}
      {!isLoading && !isError && total === 0 && (
        <p role="status" className="text-sm text-[#56657A]">Belum ada rujukan.</p>
      )}
      {isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Ringkasan gagal dimuat. Coba muat ulang halaman.
        </p>
      )}

      <div
        className="rounded-4xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-white"
        style={{ backgroundColor: NAVY }}
      >
        <Illustration name="dashboard" className="hidden sm:block w-36 h-28 shrink-0" />
        <div className="flex-1">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {tinggi.length} rujukan berisiko tinggi belum dicek
          </div>
        </div>
        <button
          type="button"
          onClick={() => go("queue")}
          className="shrink-0 inline-flex items-center justify-center gap-2 min-h-11 bg-white font-semibold px-5 py-3 rounded-4xl transition-transform hover:scale-[1.02]"
          style={{ color: NAVY }}
        >
          Lihat antrean <ArrowRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            to: "masuk" as View,
            art: "stat-masuk" as const,
            label: "Rujukan masuk",
            val: isLoading ? "…" : total.toLocaleString("id-ID"),
            sub: "di backend",
            Icon: Inbox,
          },
          {
            to: "queue" as View,
            art: "stat-cek" as const,
            label: "Perlu dicek",
            val: isLoading ? "…" : perluDicek.toLocaleString("id-ID"),
            sub: `${persen(perluDicek, total)} dari total`,
            Icon: TriangleAlert,
          },
          {
            to: "queue" as View,
            art: "stat-antre" as const,
            label: "Masih mengantre",
            val: isLoading ? "…" : menunggu.toLocaleString("id-ID"),
            sub: "belum ditindaklanjuti",
            Icon: ListChecks,
          },
          {
            to: "analytics" as View,
            art: "stat-selesai" as const,
            label: "Selesai dicek",
            val: isLoading ? "…" : selesai.toLocaleString("id-ID"),
            sub: `${persen(selesai, perluDicek)} dari yang ditandai`,
            Icon: Check,
          },
        ].map(({ label, val, sub, Icon, to, art }) => (
          <button
            type="button"
            key={label}
            onClick={() => go(to)}
            className="text-left bg-white rounded-4xl border border-[#DCE3EC] p-4 sm:p-5 hover:border-[#1E3A5F] transition-colors"
          >
            <div className="flex items-center gap-2 text-[#64748B]">
              <Icon size={15} />
              <span className="text-xs font-semibold text-[#56657A]">
                {label}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2 mt-3">
              <div>
                <div className="font-mono text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0E1B2A]">
                  {val}
                </div>
                <div className="text-xs text-[#64748B] mt-1">{sub}</div>
              </div>
              <Illustration name={art} className="hidden sm:block w-20 h-16 shrink-0" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_21.25rem] gap-6 items-start">
      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC] flex items-center justify-between">
          <div className="text-xl font-extrabold tracking-tight text-[#0E1B2A]">Risiko tinggi</div>
          <button
            type="button"
            onClick={() => go("queue")}
            className="text-xs font-semibold flex items-center gap-1 min-h-11"
            style={{ color: NAVY }}
          >
            Lihat semua <ChevronRight aria-hidden="true" size={14} />
          </button>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {tinggi.length === 0 && (
            <div className="px-5 py-8 flex flex-col items-center text-center">
              <Illustration name="selesai" className="w-40 h-28" />
              <p className="text-sm text-[#56657A] mt-2">Tidak ada rujukan berisiko tinggi yang menunggu.</p>
            </div>
          )}
          {tinggi.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">
                  {tampilPasien(c)}
                </div>
                <div className="text-xs text-[#56657A] truncate">
                  {c.diagnosa}
                </div>
              </div>
              <RiskBadge level={c.risk} score={c.riskScore} />
              <ChevronRight size={16} className="text-[#64748B]" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {[
          { to: "klarifikasi" as View, art: "pintasan-klarifikasi" as const, judul: "Klarifikasi dokter", isi: "Minta penjelasan dari dokter perujuk." },
          { to: "dinkes" as View, art: "pintasan-wilayah" as const, judul: "Pantauan wilayah", isi: "Lihat ringkasan tiap wilayah." },
          { to: "analytics" as View, art: "pintasan-analitik" as const, judul: "Analitik", isi: "Pola rujukan dan dokter yang perlu diperhatikan." },
        ].map((k) => (
          <button
            type="button"
            key={k.judul}
            onClick={() => go(k.to)}
            className="w-full text-left bg-white rounded-4xl border border-[#DCE3EC] p-5 flex items-center gap-4 hover:border-[#1E3A5F] transition-colors"
          >
            <Illustration name={k.art} className="w-24 h-20 shrink-0" />
            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-tight text-[#0E1B2A]">{k.judul}</div>
              <p className="text-sm text-[#56657A] mt-0.5">{k.isi}</p>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

// Rujukan Masuk
