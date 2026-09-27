"use client";
import { PageHead } from "../atoms/PageHead";
import { RiskBadge } from "../atoms/RiskBadge";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { useReferrals } from "../../hooks/useReferral";

export const RujukanMasuk = ({
  onSelect,
  wilayah,
}: {
  onSelect: (c: RujukanCase) => void;
  wilayah: string;
}) => {
  const { data: referrals = [], isError } = useReferrals();
  const list = referrals.filter(
    (c) => wilayah === "Semua Wilayah" || c.wilayah === wilayah,
  );
  return (
    <div className="scroll-area flex-1 overflow-y-auto p-6 space-y-5">
      <PageHead
        eyebrow="Baru masuk"
        title="Rujukan masuk"
        sub="Semua rujukan baru ada di sini. Kami bantu urutkan yang perlu kamu cek."
      />
      {isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Data rujukan belum bisa dimuat. Coba lagi sebentar.
        </p>
      )}
      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1.4fr_auto] gap-4 px-5 py-3 border-b border-[#DCE3EC] text-[11px] font-bold uppercase tracking-wider text-[#8A98AC]">
          <span>Pasien & rujukan</span>
          <span>Dari mana ke mana</span>
          <span>Perlu cek?</span>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {list.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full grid grid-cols-[1.2fr_1.4fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">
                  {c.pasien}
                </div>
                <div className="font-mono text-xs text-[#8A98AC]">
                  {c.noRujukan}
                </div>
              </div>
              <div className="flex items-stretch gap-2.5 min-w-0">
                <div className="flex flex-col items-center pt-1.5 pb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-4xl border-2 shrink-0"
                    style={{ borderColor: "#8A98AC" }}
                  />
                  <span
                    className="w-0.5 flex-1 my-0.5 min-h-[14px]"
                    style={{ backgroundColor: "#DCE3EC" }}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-4xl shrink-0"
                    style={{ backgroundColor: "#1E3A5F" }}
                  />
                </div>
                <div className="flex flex-col justify-between min-w-0 py-0.5">
                  <span className="text-xs text-[#56657A] truncate leading-snug">
                    {c.fasalOrigin}
                  </span>
                  <span className="text-sm font-semibold text-[#0E1B2A] truncate leading-snug">
                    {c.fasalTujuan}
                  </span>
                </div>
              </div>
              <RiskBadge level={c.risk} score={c.riskScore} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Review Queue
