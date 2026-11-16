"use client";

import { useState } from "react";
import { useDestinationFit } from "../../../hooks/useDestinationFit";
import { NumberField } from "../../molecules/NumberField";
import { FitCheckRow } from "./FitCheckRow";
import { FitVerdict } from "./FitVerdict";

interface DestinationFitPanelProps {
  id: string;
}

/** Apakah RS tujuan cocok untuk diagnosisnya. Penilaian aturan, terpisah dari skor risiko. */
export function DestinationFitPanel({ id }: DestinationFitPanelProps) {
  const [jarak, setJarak] = useState("");
  const { data, isLoading, isError } = useDestinationFit(id, jarak);

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold text-[#0E1B2A]">Kesimpulan:</span>
        {data && <FitVerdict vonis={data.fit.verdict} />}
      </div>
      {isLoading && <p role="status" className="text-sm text-[#56657A]">Memuat penilaian tujuan…</p>}
      {isError && <p role="alert" className="text-sm text-[#9B1C1C]">Penilaian tujuan gagal dimuat.</p>}
      {data && (
        <ul className="space-y-4">
          {data.fit.checks.map((c) => (
            <FitCheckRow key={c.name} cek={c} />
          ))}
        </ul>
      )}
      <NumberField
        label="Jarak ke RS tujuan (km, opsional)"
        value={jarak}
        onChange={setJarak}
        min={0}
        max={2000}
        placeholder="Contoh: 25"
        hint="Jarak hanya faktor sekunder dan tidak mengubah kesimpulan."
      />
      {data && <p className="text-xs text-[#56657A] leading-relaxed">{data.fit.basis}</p>}
    </div>
  );
}
