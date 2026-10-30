import { tampilPasien } from "../../../lib/formatters";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { PageHead } from "../../atoms/PageHead";
import { SecondaryButton } from "../../atoms/SecondaryButton";
import { PageScroll } from "../../molecules/PageScroll";

interface AuditTkmkbNoticeProps {
  kasus: RujukanCase;
  onKlarifikasi: (c: RujukanCase) => void;
}

// Kasus risiko tinggi hanya diputuskan TKMKB. Server tetap menegakkan; ini hanya menghindari jalan buntu.
export function AuditTkmkbNotice({
  kasus,
  onKlarifikasi,
}: AuditTkmkbNoticeProps) {
  return (
    <PageScroll>
      <PageHead
        title="Cek rujukan"
        sub={`${tampilPasien(kasus)} (${kasus.noRujukan})`}
      />
      <p
        role="note"
        className="rounded-4xl px-4 py-3 text-sm bg-[#1E3A5F] text-white"
      >
        Kasus risiko tinggi diputuskan oleh anggota TKMKB. Kamu bisa
        meneruskannya atau meminta klarifikasi dokter.
      </p>
      <SecondaryButton onClick={() => onKlarifikasi(kasus)} className="px-6 py-3">
        Minta klarifikasi dokter
      </SecondaryButton>
    </PageScroll>
  );
}
