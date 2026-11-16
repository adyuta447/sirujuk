import type { AksiKategori } from "../../../types/risk-config";
import { FIELD_CLASS } from "../../../lib/ui-classes";

interface CategoryActionFieldProps {
  label: string;
  aksi: AksiKategori;
  disabled: boolean;
  onChange: (aksi: AksiKategori) => void;
}

export function CategoryActionField({ label, aksi, disabled, onChange }: CategoryActionFieldProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-bold text-[#0E1B2A]">{label}</legend>
      <label className="block text-xs font-semibold text-[#56657A]">
        Rekomendasi tindakan
        <input value={aksi.recommendation} maxLength={200} onChange={(e) => onChange({ ...aksi, recommendation: e.target.value })} className={`${FIELD_CLASS} mt-1`} />
      </label>
      <label className="flex items-center gap-2 text-sm text-[#0E1B2A]">
        <input type="checkbox" checked={aksi.alert} onChange={(e) => onChange({ ...aksi, alert: e.target.checked })} className="size-4" />
        Munculkan peringatan untuk kategori ini
      </label>
    </fieldset>
  );
}
