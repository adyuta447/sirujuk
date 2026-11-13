import type { ReferralActionsState } from "../../../hooks/useReferralActions";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { LabeledField } from "../../molecules/LabeledField";

interface EditFormProps {
  actions: ReferralActionsState;
}

export function EditForm({ actions: { edit, simpan, sibuk } }: EditFormProps) {
  return (
    <div className="space-y-3">
      <LabeledField label="Kode diagnosis" value={edit.diagnosis} onChange={edit.setDiagnosis} maxLength={10} />
      <LabeledField label="Alasan rujukan" value={edit.alasan} onChange={edit.setAlasan} maxLength={200} />
      <LabeledField label="Narasi klinis" value={edit.narasi} onChange={edit.setNarasi} maxLength={4000} multiline />
      <PrimaryButton onClick={simpan} disabled={sibuk} className="px-5 py-3">Simpan dan hitung ulang</PrimaryButton>
    </div>
  );
}
