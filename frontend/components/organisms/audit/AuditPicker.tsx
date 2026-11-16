"use client";

import { PAGE_SIZE } from "../../../lib/constants";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { usePendingAudits } from "../../../hooks/usePendingAudits";
import { Card } from "../../atoms/Card";
import { EmptyState } from "../../atoms/EmptyState";
import { PageHead } from "../../atoms/PageHead";
import { CaseRow } from "../../molecules/CaseRow";
import { PageScroll } from "../../molecules/PageScroll";
import { Pagination } from "../../molecules/Pagination";

interface AuditPickerProps {
  onSelect: (c: RujukanCase) => void;
}

export function AuditPicker({ onSelect }: AuditPickerProps) {
  const pending = usePendingAudits();

  return (
    <PageScroll scrollRef={pending.scrollRef}>
      <PageHead
        title="Audit"
        sub="Pilih rujukan yang akan diperiksa."
        art="audit"
      />
      {pending.isError && (
        <p role="alert" className="text-sm text-[#9B1C1C]">
          Rujukan gagal dimuat. Coba muat ulang halaman.
        </p>
      )}
      {!pending.isLoading && !pending.isError && pending.totalItems === 0 ? (
        <EmptyState art="selesai" title="Tidak ada rujukan yang perlu diaudit" body="Rujukan yang menunggu pemeriksaan akan muncul di sini." />
      ) : (
        <>
          <Card className="divide-y divide-[#EEF1F5] overflow-hidden">
            {pending.tampak.map((c) => (
              <CaseRow key={c.id} kasus={c} onSelect={onSelect} />
            ))}
          </Card>
          <Pagination
            page={pending.halaman}
            totalPages={pending.totalPages}
            onChange={pending.gantiHalaman}
            totalItems={pending.totalItems}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </PageScroll>
  );
}
