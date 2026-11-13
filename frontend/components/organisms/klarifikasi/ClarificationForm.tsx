import type { ClarificationFormState } from "../../../hooks/useClarificationForm";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { PageHead } from "../../atoms/PageHead";
import { PageScroll } from "../../molecules/PageScroll";
import { AnswerPanel } from "./AnswerPanel";
import { FlaggedReasons } from "./FlaggedReasons";
import { SentExplanations } from "./SentExplanations";
import { UsedFigures } from "./UsedFigures";

interface ClarificationFormProps {
  kasus: RujukanCase;
  form: ClarificationFormState;
  onDokter: (nama: string) => void;
}

export function ClarificationForm({ kasus, form, onDokter }: ClarificationFormProps) {
  return (
    <PageScroll>
      <PageHead
        title={`Yth. ${kasus.dokter}`}
        sub="Ada rujukan Anda yang perlu kami pahami lebih lanjut. Mohon berikan penjelasan singkat."
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_26rem] gap-5 items-start">
        <div className="space-y-5">
          <FlaggedReasons alasan={kasus.alasan} />
          {kasus.klarifikasi && kasus.klarifikasi.length > 0 && <SentExplanations klarifikasi={kasus.klarifikasi} />}
          <UsedFigures indikator={kasus.indikator ?? []} />
        </div>
        <AnswerPanel form={form} onProfil={() => onDokter(kasus.dokter)} />
      </div>
    </PageScroll>
  );
}
