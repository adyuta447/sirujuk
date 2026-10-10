"use client";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { PageHead } from "../atoms/PageHead";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { RiskBadge } from "../atoms/RiskBadge";
import { useReferrals } from "../../hooks/useReferral";
import { maskPasien } from "../../lib/formatters";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { DOKTER_RISIKO, RISK, slugDokter } from "../../lib/sirujuk-data";

export const DokterProfil = ({
  slug,
  onDokter,
  onSelect,
  onKlarifikasi,
}: {
  slug?: string;
  onDokter: (nama: string) => void;
  onSelect: (c: RujukanCase) => void;
  onKlarifikasi: (c: RujukanCase) => void;
}) => {
  const { data: referrals = [] } = useReferrals();
  const dokter = DOKTER_RISIKO.find((d) => slugDokter(d.nama) === slug);

  if (!dokter) {
    return (
      <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <PageHead
          title="Profil Dokter"
          sub="Pola rujukan tiap dokter dibandingkan dokter sejenis. Untuk menentukan prioritas, bukan vonis."
        />
        {slug && (
          <p role="alert" className="text-sm text-[#9B1C1C]">
            Profil dokter tidak ditemukan. Pilih dari daftar.
          </p>
        )}
        <div className="bg-white rounded-4xl border border-[#DCE3EC] divide-y divide-[#EEF1F5] overflow-hidden">
          {DOKTER_RISIKO.map((d) => (
            <button
              type="button"
              key={d.nama}
              onClick={() => onDokter(d.nama)}
              className="w-full min-h-11 flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">{d.nama}</div>
                <div className="text-xs text-[#56657A] truncate">{d.fktp}</div>
              </div>
              <span className="font-mono text-sm font-bold text-[#0E1B2A]">{d.persentase}%</span>
              <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const kasus = referrals.filter((c) => c.dokter === dokter.nama);
  const prioritas = kasus.find((c) => c.risk !== "rendah" && c.status !== "selesai");

  return (
    <div className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 text-sm text-[#56657A]">
        <button type="button" onClick={() => onDokter("")} className="min-h-11 font-medium hover:text-[#1E3A5F]">
          Semua dokter
        </button>
        <ChevronRight aria-hidden="true" size={14} />
        <span className="font-semibold text-[#0E1B2A]">{dokter.nama}</span>
      </div>
      <PageHead title={dokter.nama} sub={dokter.narasi} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Total rujukan", v: dokter.totalRujukan },
          { l: "Perlu dicek", v: dokter.risikoTinggi },
          { l: "Porsi", v: `${dokter.persentase}%` },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-4xl border border-[#DCE3EC] p-4">
            <div className="text-xs font-semibold text-[#56657A]">{k.l}</div>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0E1B2A] mt-1">{k.v}</div>
          </div>
        ))}
      </div>

      <p role="note" className="rounded-4xl px-4 py-3 text-xs leading-relaxed bg-white border border-[#DCE3EC] text-[#0E1B2A]">
        Pola ini bisa punya alasan sah, misalnya hanya ada satu rumah sakit yang terjangkau. Karena itu dokter diminta
        klarifikasi dulu sebelum ada tindak lanjut.
      </p>

      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC] font-bold text-[#0E1B2A]">Rujukan dari dokter ini</div>
        {kasus.length === 0 && <p className="px-5 py-6 text-sm text-[#56657A]">Belum ada rujukan di data demo.</p>}
        <div className="divide-y divide-[#EEF1F5]">
          {kasus.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full min-h-11 flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">{maskPasien(c.noRujukan)}</div>
                <div className="text-xs text-[#56657A] truncate">{c.diagnosa}</div>
              </div>
              <RiskBadge level={c.risk} score={c.riskScore} />
              <ChevronRight aria-hidden="true" size={16} className="text-[#64748B]" />
            </button>
          ))}
        </div>
      </div>

      {prioritas && (
        <PrimaryButton onClick={() => onKlarifikasi(prioritas)} className="w-full sm:w-auto px-5 py-3">
          <MessageSquareText size={18} /> Minta klarifikasi ({RISK[prioritas.risk].label})
        </PrimaryButton>
      )}
    </div>
  );
};
