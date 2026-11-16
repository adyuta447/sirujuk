"use client";

import type { RujukanCase } from "../../../lib/sirujuk-data";
import { usePendingClarifications } from "../../../hooks/usePendingClarifications";
import { Card } from "../../atoms/Card";
import { EmptyState } from "../../atoms/EmptyState";
import { PageHead } from "../../atoms/PageHead";
import { PageScroll } from "../../molecules/PageScroll";
import { ClarificationPickerRow } from "./ClarificationPickerRow";

interface ClarificationPickerProps {
  onPilih: (c: RujukanCase) => void;
}

export function ClarificationPicker({ onPilih }: ClarificationPickerProps) {
  const list = usePendingClarifications();

  return (
    <PageScroll>
      <PageHead title="Klarifikasi" art="klarifikasi" sub="Pilih rujukan yang memerlukan penjelasan dari dokter." />
      {list.length === 0 ? (
        <EmptyState art="klarifikasi" title="Tidak ada permintaan klarifikasi" body="Permintaan penjelasan untuk dokter akan muncul di sini." />
      ) : (
        <Card className="divide-y divide-[#EEF1F5] overflow-hidden">
          {list.map((c) => (
            <ClarificationPickerRow key={c.id} kasus={c} onPilih={onPilih} />
          ))}
        </Card>
      )}
    </PageScroll>
  );
}
