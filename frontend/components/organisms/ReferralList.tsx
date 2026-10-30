"use client";

import { PAGE_SIZE } from "../../lib/constants";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { useReferralList } from "../../hooks/useReferralList";
import { Card } from "../atoms/Card";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { Pagination } from "../molecules/Pagination";
import { ReferralListEmpty } from "./referral-list/ReferralListEmpty";
import { ReferralRow } from "./referral-list/ReferralRow";

interface ReferralListProps {
  onSelect: (c: RujukanCase) => void;
  wilayah: string;
  query: string;
}

export function ReferralList({ onSelect, wilayah, query }: ReferralListProps) {
  const list = useReferralList(wilayah, query);

  return (
    <PageScroll scrollRef={list.scrollRef}>
      <PageHead
        title="Rujukan masuk"
        art="dashboard"
        sub="Semua rujukan yang baru masuk."
      />
      {list.isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Data rujukan gagal dimuat. Coba muat ulang halaman.
        </p>
      )}
      {list.isLoading && (
        <p role="status" className="text-sm text-[#56657A]">
          Memuat rujukan…
        </p>
      )}
      {!list.isLoading && !list.isError && list.totalItems === 0 && (
        <ReferralListEmpty />
      )}
      <Card className="overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.2fr_1.4fr_auto] gap-4 px-5 py-3 border-b border-[#DCE3EC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
          <span>Pasien dan rujukan</span>
          <span>Faskes asal dan tujuan</span>
          <span>Risiko</span>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {list.tampak.map((c) => (
            <ReferralRow key={c.id} kasus={c} onSelect={onSelect} />
          ))}
        </div>
      </Card>
      <Pagination
        page={list.halaman}
        totalPages={list.totalPages}
        onChange={list.gantiHalaman}
        totalItems={list.totalItems}
        pageSize={PAGE_SIZE}
      />
    </PageScroll>
  );
}
