import { PILIHAN_KOMPETENSI, PILIHAN_TRI } from "../../../data/pilihan-simulasi";
import type { FormSimulasi, UbahFormSimulasi } from "../../../types/simulate-form";
import { SelectField } from "../../molecules/SelectField";

interface DestinationInputsProps {
  form: FormSimulasi;
  onChange: UbahFormSimulasi;
}

/** Asumsi tentang RS tujuan. Tidak masuk model: hanya mengubah penilaian kesesuaian tujuan, bukan skor. */
export function DestinationInputs({ form, onChange }: DestinationInputsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-bold text-[#0E1B2A]">Asumsi RS tujuan</legend>
      <p className="text-xs text-[#56657A] leading-relaxed">
        Bagian ini tidak mengubah skor risiko, karena model tidak dilatih dengan jarak atau kompetensi RS. Hasilnya hanya
        tampil pada penilaian kesesuaian tujuan.
      </p>
      <label className="block text-xs font-semibold text-[#56657A]">
        Jarak ke RS tujuan: {form.jarak ? `${form.jarak} km` : "tidak diatur"}
        <input type="range" min={0} max={500} step={5} value={form.jarak || 0} onChange={(e) => onChange("jarak", e.target.value)} className="mt-2 block w-full" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <SelectField label="Kompetensi RS" value={form.kompetensi} options={PILIHAN_KOMPETENSI} onChange={(v) => onChange("kompetensi", v)} />
        <SelectField label="Dokter spesialis dan alat tersedia" value={form.alat} options={PILIHAN_TRI} onChange={(v) => onChange("alat", v)} />
      </div>
    </fieldset>
  );
}
