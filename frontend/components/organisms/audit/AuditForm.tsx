import type { Peran } from "../../../lib/akses";
import { tampilPasien } from "../../../lib/formatters";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import type { AuditFormState } from "../../../hooks/useAuditForm";
import { PageHead } from "../../atoms/PageHead";
import { PageScroll } from "../../molecules/PageScroll";
import { AuditActions } from "./AuditActions";
import { AuditChecklist } from "./AuditChecklist";
import { AuditNoteField } from "./AuditNoteField";
import { CaseSummary } from "./CaseSummary";
import { DecisionOptions } from "./DecisionOptions";
import { ReviewerCard } from "./ReviewerCard";
import { ScoreDisclaimer } from "./ScoreDisclaimer";

interface AuditFormProps {
  kasus: RujukanCase;
  form: AuditFormState;
  nama?: string;
  peran?: Peran;
  onCancel: () => void;
}

export function AuditForm({ kasus, form, nama, peran, onCancel }: AuditFormProps) {
  return (
    <PageScroll spacing="space-y-5">
      <PageHead title="Cek rujukan" sub={`${tampilPasien(kasus)} (${kasus.noRujukan})`} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_23.75rem] gap-5 items-start">
        <div className="space-y-5">
          <AuditChecklist checks={form.checks} onToggle={form.toggleCheck} />
          <DecisionOptions selected={form.keputusan} onChange={form.setKeputusan} />
          <AuditNoteField value={form.catatan} onChange={form.setCatatan} />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-0">
          <CaseSummary kasus={kasus} />
          <ScoreDisclaimer />
          <ReviewerCard nama={nama} peran={peran} />
          {form.saveError && (
            <p role="alert" className="text-sm text-[#9B1C1C]">
              {form.saveError} Keputusan belum tersimpan dan tidak ada salinan lokal.
            </p>
          )}
          <AuditActions canSubmit={form.canSubmit} saving={form.menyimpan} onSubmit={form.submit} onCancel={onCancel} />
        </aside>
      </div>
    </PageScroll>
  );
}
