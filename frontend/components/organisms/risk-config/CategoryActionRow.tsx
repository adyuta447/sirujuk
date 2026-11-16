import type { RiskLevel } from "../../../lib/sirujuk-data";
import { FIELD_CLASS } from "../../../lib/ui-classes";
import type { AksiKategori } from "../../../types/risk-config";
import { Chip } from "../../atoms/Chip";
import { RiskBadge } from "../../atoms/RiskBadge";

interface CategoryActionRowProps {
  label: string;
  level: RiskLevel;
  aksi: AksiKategori;
  bisaUbah: boolean;
  onChange: (aksi: AksiKategori) => void;
}

/** Satu baris: kategori (lencana risiko yang sama dengan di seluruh app), rekomendasi tindakan, dan penanda peringatan. */
export function CategoryActionRow({ label, level, aksi, bisaUbah, onChange }: CategoryActionRowProps) {
  return (
    <li className="grid grid-cols-1 sm:grid-cols-[9rem_1fr_auto] gap-2 sm:gap-4 items-start sm:items-center px-5 py-4">
      <div>
        <RiskBadge level={level} className="sm:w-full sm:justify-center" />
      </div>
      {bisaUbah ? (
        <input
          aria-label={`Rekomendasi tindakan ${label}`}
          value={aksi.recommendation}
          maxLength={200}
          onChange={(e) => onChange({ ...aksi, recommendation: e.target.value })}
          className={FIELD_CLASS}
        />
      ) : (
        <p className="text-sm text-[#0E1B2A] leading-relaxed">{aksi.recommendation}</p>
      )}
      {bisaUbah ? (
        <label className="inline-flex items-center gap-2 text-sm text-[#0E1B2A] whitespace-nowrap">
          <input type="checkbox" checked={aksi.alert} onChange={(e) => onChange({ ...aksi, alert: e.target.checked })} className="size-4 accent-[#1E3A5F]" />
          Peringatan
        </label>
      ) : (
        <Chip>{aksi.alert ? "Peringatan aktif" : "Tanpa peringatan"}</Chip>
      )}
    </li>
  );
}
