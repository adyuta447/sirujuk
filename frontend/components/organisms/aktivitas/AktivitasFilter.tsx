import { JENIS_AKTIVITAS } from "../../../data/jenis-aktivitas";
import type { AktivitasState } from "../../../hooks/useAktivitas";
import type { HasilAktivitas } from "../../../types/activity";
import { FilterChip } from "../../atoms/FilterChip";
import { FieldGrid } from "../../molecules/FieldGrid";
import { LabeledField } from "../../molecules/LabeledField";
import { SelectField } from "../../molecules/SelectField";

interface AktivitasFilterProps {
  a: Pick<AktivitasState, "outcome" | "setOutcome" | "resource" | "setResource" | "noRujukan" | "setNoRujukan">;
}

const HASIL: { nilai: HasilAktivitas | ""; label: string }[] = [
  { nilai: "", label: "Semua" },
  { nilai: "ok", label: "Berhasil" },
  { nilai: "denied", label: "Tidak diizinkan" },
  { nilai: "rejected", label: "Ditolak" },
  { nilai: "failed", label: "Gagal" },
];

export function AktivitasFilter({ a }: AktivitasFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {HASIL.map((h) => (
          <FilterChip key={h.nilai} label={h.label} active={a.outcome === h.nilai} onClick={() => a.setOutcome(h.nilai)} />
        ))}
      </div>
      <FieldGrid kolom={2}>
        <SelectField label="Jenis" value={a.resource} options={JENIS_AKTIVITAS} onChange={a.setResource} />
        <LabeledField label="Nomor rujukan" placeholder="Contoh: r-001" value={a.noRujukan} onChange={a.setNoRujukan} maxLength={64} />
      </FieldGrid>
    </div>
  );
}
