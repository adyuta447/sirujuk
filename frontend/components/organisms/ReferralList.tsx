"use client";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_REGION } from "../../lib/constants";
import { Illustration } from "../atoms/Illustration";
import { PageHead } from "../atoms/PageHead";
import { RiskBadge } from "../atoms/RiskBadge";
import { Pagination } from "../molecules/Pagination";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { PAGE_SIZE } from "../../lib/constants";
import { cocokCari, tampilPasien } from "../../lib/formatters";
import { useReferrals } from "../../hooks/useReferral";

export const RujukanMasuk = ({
  onSelect,
  wilayah,
  query,
}: {
  onSelect: (c: RujukanCase) => void;
  wilayah: string;
  query: string;
}) => {
  const { data: referrals = [], isError, isLoading } = useReferrals();
  const [page, setPage] = useState(1);
  const wadahRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setPage(1);
  }, [wilayah, query]);
  const list = referrals.filter(
    (c) =>
      (wilayah === DEFAULT_REGION || c.wilayah === wilayah) && cocokCari(c, query),
  );
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const halaman = Math.min(page, totalPages);
  const tampak = list.slice((halaman - 1) * PAGE_SIZE, halaman * PAGE_SIZE);
  const gantiHalaman = (p: number) => {
    setPage(p);
    wadahRef.current?.scrollTo({ top: 0 });
  };
  return (
    <div ref={wadahRef} className="scroll-area flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <PageHead
        title="Rujukan masuk"
        art="dashboard"
        sub="Semua rujukan yang baru masuk."
      />
      {isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Data rujukan gagal dimuat. Coba muat ulang halaman.
        </p>
      )}
      {isLoading && <p role="status" className="text-sm text-[#56657A]">Memuat rujukan…</p>}
      {!isLoading && !isError && list.length === 0 && (
        <div role="status" className="bg-white rounded-4xl border border-[#DCE3EC] py-10 flex flex-col items-center text-center px-4">
          <Illustration name="tidak-ditemukan" className="w-44 h-32" />
          <p className="font-bold text-[#0E1B2A] mt-3">Tidak ada rujukan yang cocok</p>
          <p className="text-sm text-[#56657A] mt-1">Ubah kata kunci atau wilayah.</p>
        </div>
      )}
      <div className="bg-white rounded-4xl border border-[#DCE3EC] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.2fr_1.4fr_auto] gap-4 px-5 py-3 border-b border-[#DCE3EC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
          <span>Pasien dan rujukan</span>
          <span>Faskes asal dan tujuan</span>
          <span>Risiko</span>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {tampak.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full grid grid-cols-1 sm:grid-cols-[1.2fr_1.4fr_auto] gap-2 sm:gap-4 items-start sm:items-center px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#0E1B2A]">
                  {c.pasien}
                </div>
                <div className="font-mono text-xs text-[#64748B]">
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
      <Pagination page={halaman} totalPages={totalPages} onChange={gantiHalaman} totalItems={list.length} pageSize={PAGE_SIZE} />
    </div>
  );
};
