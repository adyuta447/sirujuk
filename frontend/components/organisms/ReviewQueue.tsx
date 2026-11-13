"use client";

import { PAGE_SIZE } from "../../lib/constants";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { useReviewQueue } from "../../hooks/useReviewQueue";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { Pagination } from "../molecules/Pagination";
import { QueueCard } from "./review-queue/QueueCard";
import { QueueEmpty } from "./review-queue/QueueEmpty";
import { RiskFilter } from "./review-queue/RiskFilter";

interface ReviewQueueProps {
  onSelect: (c: RujukanCase) => void;
  wilayah: string;
  query: string;
}

export function ReviewQueue({ onSelect, wilayah, query }: ReviewQueueProps) {
  const queue = useReviewQueue(wilayah, query);

  return (
    <PageScroll scrollRef={queue.scrollRef}>
      <PageHead
        title="Antrean Cek"
        sub="Data dummy dari backend, diurutkan dari skor tertinggi. Skor heuristik, bukan evaluasi kecurangan."
        art="antrean-kosong"
      />
      {queue.isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Antrean gagal dimuat. Coba muat ulang halaman.
        </p>
      )}
      <RiskFilter
        segments={queue.segments}
        active={queue.filter}
        onChange={queue.setFilter}
      />
      {queue.isLoading && (
        <p role="status" className="text-sm text-[#56657A]">
          Memuat antrean…
        </p>
      )}
      {!queue.isLoading && queue.totalItems === 0 ? (
        <QueueEmpty />
      ) : (
        <div className="space-y-4">
          {queue.tampak.map((c) => (
            <QueueCard key={c.id} kasus={c} onSelect={onSelect} />
          ))}
        </div>
      )}
      <Pagination
        page={queue.halaman}
        totalPages={queue.totalPages}
        onChange={queue.gantiHalaman}
        totalItems={queue.totalItems}
        pageSize={PAGE_SIZE}
      />
    </PageScroll>
  );
}
