"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Cake,
  ChevronRight,
  FileText,
  HeartPulse,
  History,
  MapPin,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { ReferralActions } from "./ReferralActions";
import { ClaimBadge } from "../atoms/ClaimBadge";
import { useSession } from "../../hooks/useSession";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { INDIKATOR_DEMO, NAVY, RISK } from "../../lib/sirujuk-data";

export const ReferralDetail = ({
  kasus,
  onBack,
  onAudit,
  onDokter,
  onKlarifikasi,
}: {
  kasus: RujukanCase;
  onBack: () => void;
  onAudit: (k: RujukanCase) => void;
  onDokter: (nama: string) => void;
  onKlarifikasi: (k: RujukanCase) => void;
}) => {
  const [open, setOpen] = useState<string | null>("pola");
  const r = RISK[kasus.risk];
  const { data: sesi } = useSession();
  // Kasus merah hanya diputuskan TKMKB; server menolak verifikator, jadi tombolnya disembunyikan.
  const hanyaTKMKB = kasus.risk === "tinggi" && sesi?.role === "verifikator";

  const Section = ({
    id,
    title,
    Icon,
    children,
  }: {
    id: string;
    title: string;
    Icon: typeof FileText;
    children: ReactNode;
  }) => (
    <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
      <button
        type="button"
        aria-expanded={open === id}
        className="w-full min-h-11 flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors"
        onClick={() => setOpen(open === id ? null : id)}
      >
        <Icon aria-hidden="true" size={16} className="text-[#56657A]" />
        <span className="font-bold text-sm text-[#0E1B2A]">{title}</span>
        <ChevronRight
          aria-hidden="true"
          size={16}
          className="ml-auto text-[#56657A] transition-transform"
          style={{ transform: open === id ? "rotate(90deg)" : "none" }}
        />
      </button>
      {open === id && (
        <div className="px-5 pb-5 pt-1 border-t border-[#EEF1F5]">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#56657A]">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 hover:text-[#1E3A5F] transition-colors font-medium"
        >
          Kembali ke antrean
        </button>
        <ChevronRight size={14} />
        <span className="text-[#0E1B2A] font-semibold font-mono">
          {kasus.noRujukan}
        </span>
      </div>

      <div
        className="rounded-4xl p-4 sm:p-5 text-white"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#C9D6E6]">
              Detail rujukan
            </div>
            <div className="font-mono text-xs text-[#C9D6E6] mt-1">
              {kasus.noRujukan}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{kasus.pasien}</div>
          </div>
          <div className="text-center">
            <div
              role="img"
              className="w-20 h-20 rounded-4xl flex flex-col items-center justify-center"
              aria-label={`${r.label}, skor ${kasus.riskScore}`}
              style={{ backgroundColor: r.solid }}
            >
              <span className="font-mono text-3xl font-extrabold">
                {kasus.riskScore}
              </span>
              <span className="text-[10px] uppercase tracking-wider">
                skor
              </span>
            </div>
            <div className="mt-2 text-xs font-semibold text-[#D5DFEC]">
              {r.label} · skor dummy
            </div>
          </div>
        </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5">
          <dl className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                ...(kasus.usia ? [{ Icon: Cake, k: "Usia", v: `${kasus.usia} tahun` }] : []),
                ...(kasus.jenisPeserta ? [{ Icon: BadgeCheck, k: "Peserta", v: kasus.jenisPeserta }] : []),
                { Icon: MapPin, k: "Wilayah", v: kasus.wilayah },
                { Icon: HeartPulse, k: "Diagnosis", v: kasus.diagnosa },
              ].map(({ Icon, k, v }) => (
                <div key={k} className="flex items-center gap-2.5 min-w-0">
                  <Icon aria-hidden="true" size={34} strokeWidth={1.6} className="shrink-0 text-[#C9D6E6]" />
                  <div className="min-w-0">
                    <dt className="text-[11px] text-[#C9D6E6]">{k}</dt>
                    <dd className="text-sm font-bold leading-tight">{v}</dd>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2.5 min-w-0">
                <Stethoscope aria-hidden="true" size={34} strokeWidth={1.6} className="shrink-0 text-[#C9D6E6]" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-[#C9D6E6]">Dokter</dt>
                  <dd>
                    <button
                      type="button"
                      onClick={() => onDokter(kasus.dokter)}
                      className="text-sm font-bold leading-tight underline underline-offset-2 text-left"
                    >
                      {kasus.dokter}
                    </button>
                  </dd>
                </div>
              </div>
            </dl>
          <ol className="lg:ml-auto">
            <li className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-4 h-4 rounded-4xl border-4 border-white shrink-0" />
                <span className="w-1 flex-1 min-h-8 bg-[#3A5880]" />
              </div>
              <div className="pb-4">
                <div className="text-[11px] text-[#C9D6E6]">Diperiksa di · {kasus.tanggal}</div>
                <div className="text-base font-extrabold leading-tight">{kasus.fasalOrigin}</div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-4 h-4 rounded-4xl bg-white shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] text-[#C9D6E6]">Lalu dirujuk ke</div>
                <div className="text-base font-extrabold leading-tight">{kasus.fasalTujuan}</div>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <div
        className="bg-white rounded-4xl border-2 overflow-hidden"
        style={{ borderColor: r.solid }}
      >
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ backgroundColor: r.solid, color: "#FFFFFF" }}
        >
          <TriangleAlert size={16} />
          <span className="font-bold text-sm">
            Kenapa rujukan ini perlu dicek
          </span>
        </div>
        {kasus.alasan.length > 0 ? (
          <div className="divide-y divide-[#EEF1F5]">
            {kasus.alasan.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <span
                  className="w-6 h-6 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0 text-white"
                  style={{ backgroundColor: r.solid }}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="font-semibold text-sm text-[#0E1B2A]">
                    {a.judul}
                  </div>
                  <p className="text-sm text-[#56657A] mt-0.5 leading-relaxed">
                    {a.penjelasan}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm" style={{ color: RISK.rendah.text }}>
            Tidak ada pola mencurigakan. Rujukan ini sesuai prosedur.
          </p>
        )}
      </div>

      <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] pt-1">
        Data pendukung
      </div>

      {kasus.indikator && kasus.indikator.length > 0 && (
        <Section id="pola" title="Rincian Skor (4 Indikator)" Icon={TrendingUp}>
          <div className="pt-4 space-y-4">
            <p className="text-sm text-[#56657A]">
              Perbandingan {kasus.dokter} dengan dokter sejenis di wilayah yang sama.
            </p>
            {kasus.indikator.map((row) => (
              <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
                <div>
                  <div className="font-semibold text-[#0E1B2A]">{row.label}</div>
                  <div className="text-xs text-[#56657A] mt-0.5 leading-relaxed">{row.banding}</div>
                </div>
                <span className="font-mono font-bold sm:text-right shrink-0" style={{ color: RISK[row.level].text }}>
                  {row.nilai}
                </span>
              </div>
            ))}
            {/(SISRUTE_STALE|INSUFFICIENT_HISTORY)/.test(kasus.kodeAlasan ?? "") && (
              <p role="note" className="rounded-4xl px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: "#4B3A8A", color: "#FFFFFF" }}>
                Kualitas data kurang (riwayat dokter belum cukup atau data SISRUTE sudah lama), jadi kepercayaan skor ini lebih rendah.
              </p>
            )}
            <p className="text-xs text-[#56657A]">Skor adalah prioritas peninjauan, bukan bukti kecurangan. Keputusan akhir ada pada petugas. Kinerja model baru diukur pada data sintetis.</p>
          </div>
        </Section>
      )}

      <Section id="narasi" title="Narasi Dokter" Icon={History}>
        <p className="pt-4 text-sm text-[#56657A] leading-relaxed whitespace-pre-line">
          {kasus.narasi || "Narasi klinis belum diisi dokter."}
        </p>
      </Section>

      {kasus.riwayatSkor && kasus.riwayatSkor.length > 0 && (
        <Section id="skor-lama" title="Skor Sebelumnya" Icon={History}>
          <ul className="pt-4 space-y-2 text-sm text-[#56657A]">
            {kasus.riwayatSkor.map((h) => (
              <li key={h.tanggal} className="flex justify-between gap-4">
                <span>{new Date(h.tanggal).toLocaleString("id-ID")} (model {h.versiModel})</span>
                <span className="font-mono font-bold text-[#0E1B2A]">{h.skor}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {kasus.narasi !== undefined && <ReferralActions kasus={kasus} onArchived={onBack} />}

      {kasus.status !== "selesai" && (
        <div className="sticky bottom-0 bg-[#F4F6F9] pt-3 pb-1">
          <div className="flex flex-col sm:flex-row gap-3">
            {hanyaTKMKB ? (
              <p role="note" className="flex-1 rounded-4xl px-4 py-3 text-sm bg-[#1E3A5F] text-white">
                Kasus risiko tinggi diputuskan oleh TKMKB.
              </p>
            ) : (
              <PrimaryButton
                onClick={() => onAudit(kasus)}
                className="flex-1 py-3.5"
              >
                Cek rujukan ini <ArrowRight size={18} />
              </PrimaryButton>
            )}
            <button
              type="button"
              onClick={() => onKlarifikasi(kasus)}
              className="min-h-11 px-5 py-3 border border-[#DCE3EC] bg-white text-[#1E3A5F] font-semibold rounded-4xl hover:bg-[#F8FAFC]"
            >
              Minta klarifikasi dokter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
