"use client";

import { PAGE_SIZE } from "../../lib/constants";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { useReviewQueue } from "../../hooks/useReviewQueue";
import { EmptyState } from "../atoms/EmptyState";
import { PageHead } from "../atoms/PageHead";
import { PageScroll } from "../molecules/PageScroll";
import { PagerKursor } from "../molecules/PagerKursor";
import { QueueCard } from "./review-queue/QueueCard";
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
        sub="Klaim yang ditahan paling atas, lalu risiko tertinggi. Skor adalah alat bantu, bukan bukti kecurangan."
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
      {!queue.isLoading && queue.total === 0 ? (
        <EmptyState art="antrean-kosong" title="Tidak ada rujukan" body="Coba kategori lain atau pilih Semua." />
      ) : (
        <div className="space-y-4">
          {queue.tampak.map((c) => (
            <QueueCard key={c.id} kasus={c} onSelect={onSelect} />
          ))}
        </div>
      )}
      <PagerKursor
        halaman={queue.halaman}
        jumlahTampil={queue.tampak.length}
        total={queue.total}
        pageSize={PAGE_SIZE}
        adaSebelum={queue.adaSebelum}
        adaLanjut={queue.adaLanjut}
        onSebelum={queue.sebelum}
        onBerikut={queue.berikut}
      />
    </PageScroll>
  );
}
