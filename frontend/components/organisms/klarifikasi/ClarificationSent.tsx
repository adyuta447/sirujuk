import { ArrowRight } from "lucide-react";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { PrimaryButton } from "../../atoms/PrimaryButton";

interface ClarificationSentProps {
  kasus: RujukanCase;
  onDetail: (c: RujukanCase) => void;
}

export function ClarificationSent({ kasus, onDetail }: ClarificationSentProps) {
  return (
    <div role="status" className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
      <h2 className="text-3xl font-extrabold tracking-tight text-[#0E1B2A]">Penjelasan terkirim</h2>
      <p className="text-sm text-[#56657A] max-w-sm">
        Penjelasan untuk {kasus.noRujukan} akan dibaca verifikator. Tidak ada tindak lanjut sebelum ditinjau manusia.
      </p>
      <PrimaryButton onClick={() => onDetail(kasus)} className="px-5 py-3">
        Lihat detail rujukan <ArrowRight size={18} />
      </PrimaryButton>
    </div>
  );
}
