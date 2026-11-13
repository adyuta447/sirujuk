import { FIELD_CLASS } from "../../../lib/ui-classes";
import type { ReferralActionsState } from "../../../hooks/useReferralActions";
import { PrimaryButton } from "../../atoms/PrimaryButton";

interface ArchiveFormProps {
  actions: ReferralActionsState;
}

export function ArchiveForm({ actions: { catatan, setCatatan, arsipkan, sibuk } }: ArchiveFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-[#56657A]">
        Rujukan disembunyikan dari daftar. Skor dan riwayat audit tetap tersimpan untuk banding.
      </p>
      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        maxLength={2000}
        placeholder="Alasan pengarsipan"
        aria-label="Alasan pengarsipan"
        className={`${FIELD_CLASS} h-24 resize-none`}
      />
      <PrimaryButton onClick={arsipkan} disabled={sibuk} className="px-5 py-3">Arsipkan rujukan</PrimaryButton>
    </div>
  );
}
