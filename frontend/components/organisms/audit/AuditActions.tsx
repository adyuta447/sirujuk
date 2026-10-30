import { Check } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";

interface AuditActionsProps {
  canSubmit: boolean;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AuditActions({
  canSubmit,
  saving,
  onSubmit,
  onCancel,
}: AuditActionsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 pb-2">
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || saving}
        className="flex-1 py-3.5 text-white font-bold rounded-4xl transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        style={{ backgroundColor: canSubmit ? NAVY : "#9AA8BA" }}
      >
        <Check size={18} /> {saving ? "Menyimpan…" : "Simpan keputusanku"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-3.5 border border-[#DCE3EC] bg-white text-[#56657A] font-semibold rounded-4xl hover:bg-[#F8FAFC] transition-colors"
      >
        Batal
      </button>
    </div>
  );
}
