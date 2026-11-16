import { ALASAN } from "../../../data/skor-reasons";
import { PILIHAN_TRI } from "../../../data/pilihan-simulasi";
import type { FormSimulasi, UbahFormSimulasi } from "../../../types/simulate-form";
import { FieldGrid } from "../../molecules/FieldGrid";
import { LabeledField } from "../../molecules/LabeledField";
import { NumberField } from "../../molecules/NumberField";
import { SelectField } from "../../molecules/SelectField";
import { TitledCard } from "../../molecules/TitledCard";

interface ModelInputsProps {
  form: FormSimulasi;
  onChange: UbahFormSimulasi;
}

const ALASAN_PILIHAN = [{ value: "", label: "Dari rujukan dasar" }, ...ALASAN.map((a) => ({ value: a.kategori, label: a.teks }))];

/** Masukan yang benar-benar dipakai model. Yang dikosongkan diambil dari rujukan dasar. */
export function ModelInputs({ form, onChange }: ModelInputsProps) {
  return (
    <TitledCard title="Masukan model">
      <p className="mt-1 text-sm text-[#56657A]">Kosongkan isian untuk memakai nilai dari rujukan dasar.</p>
      <div className="mt-4 space-y-4">
        <FieldGrid kolom={3}>
          <LabeledField label="ID rujukan dasar (opsional)" value={form.baseId} onChange={(v) => onChange("baseId", v)} maxLength={64} />
          <LabeledField label="Kode diagnosis" value={form.diagnosis} onChange={(v) => onChange("diagnosis", v)} maxLength={10} />
          <SelectField label="Alasan rujukan" value={form.alasan} options={ALASAN_PILIHAN} onChange={(v) => onChange("alasan", v)} />
        </FieldGrid>
        <FieldGrid kolom={4}>
          <NumberField label="Rujukan 90 hari (n)" value={form.n90} min={0} onChange={(v) => onChange("n90", v)} />
          <NumberField label="Keluhan ringan NS (%)" value={form.ns90} min={0} max={100} onChange={(v) => onChange("ns90", v)} />
          <NumberField label="Rujukan 180 hari (n)" value={form.n180} min={0} onChange={(v) => onChange("n180", v)} />
          <NumberField label="Konsentrasi HHI" value={form.hhi180} min={0} max={10000} onChange={(v) => onChange("hhi180", v)} />
        </FieldGrid>
        <FieldGrid kolom={4}>
          <NumberField label="Umur data SISRUTE (hari)" value={form.umurSisrute} min={0} max={3650} onChange={(v) => onChange("umurSisrute", v)} />
          <SelectField label="Alat/SDM tersedia (SISRUTE)" value={form.sisrute} options={PILIHAN_TRI} onChange={(v) => onChange("sisrute", v)} />
          <SelectField label="Menuju RS tujuan dominan" value={form.dominan} options={PILIHAN_TRI} onChange={(v) => onChange("dominan", v)} />
          <SelectField label="RS tujuan yang terdekat" value={form.terdekat} options={PILIHAN_TRI} onChange={(v) => onChange("terdekat", v)} />
        </FieldGrid>
      </div>
    </TitledCard>
  );
}
