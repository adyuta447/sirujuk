import { ALASAN } from "../../../data/skor-reasons";
import { PILIHAN_TRI } from "../../../data/pilihan-simulasi";
import type { FormSimulasi, UbahFormSimulasi } from "../../../types/simulate-form";
import { LabeledField } from "../../molecules/LabeledField";
import { NumberField } from "../../molecules/NumberField";
import { SelectField } from "../../molecules/SelectField";

interface ModelInputsProps {
  form: FormSimulasi;
  onChange: UbahFormSimulasi;
}

const ALASAN_PILIHAN = [{ value: "", label: "Dari rujukan dasar" }, ...ALASAN.map((a) => ({ value: a.kategori, label: a.teks }))];

/** Masukan yang benar-benar dipakai model. Yang dikosongkan diambil dari rujukan dasar. */
export function ModelInputs({ form, onChange }: ModelInputsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-bold text-[#0E1B2A]">Masukan model</legend>
      <div className="grid sm:grid-cols-3 gap-4">
        <LabeledField label="ID rujukan dasar (opsional)" value={form.baseId} onChange={(v) => onChange("baseId", v)} maxLength={64} />
        <LabeledField label="Kode diagnosis" value={form.diagnosis} onChange={(v) => onChange("diagnosis", v)} maxLength={10} />
        <SelectField label="Alasan rujukan" value={form.alasan} options={ALASAN_PILIHAN} onChange={(v) => onChange("alasan", v)} />
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <NumberField label="Rujukan 90 hari (n)" value={form.n90} min={0} onChange={(v) => onChange("n90", v)} />
        <NumberField label="Keluhan ringan NS (%)" value={form.ns90} min={0} max={100} onChange={(v) => onChange("ns90", v)} />
        <NumberField label="Rujukan 180 hari (n)" value={form.n180} min={0} onChange={(v) => onChange("n180", v)} />
        <NumberField label="Konsentrasi HHI" value={form.hhi180} min={0} max={10000} onChange={(v) => onChange("hhi180", v)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <NumberField label="Umur data SISRUTE (hari)" value={form.umurSisrute} min={0} max={3650} onChange={(v) => onChange("umurSisrute", v)} />
        <SelectField label="RS tujuan adalah yang terdekat" value={form.terdekat} options={PILIHAN_TRI} onChange={(v) => onChange("terdekat", v)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <SelectField label="Menuju RS tujuan dominan" value={form.dominan} options={PILIHAN_TRI} onChange={(v) => onChange("dominan", v)} />
        <SelectField label="Alat/SDM tersedia di faskes asal (SISRUTE)" value={form.sisrute} options={PILIHAN_TRI} onChange={(v) => onChange("sisrute", v)} />
      </div>
    </fieldset>
  );
}
