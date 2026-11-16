import { Info } from "lucide-react";
import { PILIHAN_KOMPETENSI, PILIHAN_TRI } from "../../../data/pilihan-simulasi";
import type { FormSimulasi, UbahFormSimulasi } from "../../../types/simulate-form";
import { NoticeBanner } from "../../atoms/NoticeBanner";
import { FieldGrid } from "../../molecules/FieldGrid";
import { RangeField } from "../../molecules/RangeField";
import { SelectField } from "../../molecules/SelectField";
import { TitledCard } from "../../molecules/TitledCard";

interface DestinationInputsProps {
  form: FormSimulasi;
  onChange: UbahFormSimulasi;
}

/** Asumsi tentang RS tujuan. Tidak masuk model: hanya mengubah penilaian kesesuaian tujuan, bukan skor. */
export function DestinationInputs({ form, onChange }: DestinationInputsProps) {
  return (
    <TitledCard title="Asumsi RS tujuan">
      <div className="mt-4 space-y-4">
        <NoticeBanner Icon={Info}>
          Bagian ini tidak mengubah skor risiko: model tidak dilatih dengan jarak atau kompetensi RS. Hasilnya hanya tampil pada penilaian kesesuaian tujuan.
        </NoticeBanner>
        <RangeField label="Jarak ke RS tujuan" value={form.jarak} onChange={(v) => onChange("jarak", v)} min={0} max={500} step={5} satuan="km" />
        <FieldGrid kolom={2}>
          <SelectField label="Kompetensi RS" value={form.kompetensi} options={PILIHAN_KOMPETENSI} onChange={(v) => onChange("kompetensi", v)} />
          <SelectField label="Dokter spesialis dan alat tersedia" value={form.alat} options={PILIHAN_TRI} onChange={(v) => onChange("alat", v)} />
        </FieldGrid>
      </div>
    </TitledCard>
  );
}
