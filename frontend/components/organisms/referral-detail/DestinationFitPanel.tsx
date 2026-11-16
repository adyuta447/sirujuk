"use client";

import { useState } from "react";
import { useDestinationFit } from "../../../hooks/useDestinationFit";
import { FIELD_CLASS } from "../../../lib/ui-classes";
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
      <label className="block text-xs font-semibold text-[#56657A] max-w-xs">
        Jarak ke RS tujuan (km, opsional)
        <input type="number" inputMode="decimal" min={0} max={2000} value={jarak} onChange={(e) => setJarak(e.target.value)} className={`${FIELD_CLASS} mt-1`} />
      </label>
      {isLoading && <p role="status" className="text-sm text-[#56657A]">Memuat penilaian tujuan…</p>}
      {isError && <p role="alert" className="text-sm text-[#9B1C1C]">Penilaian tujuan gagal dimuat.</p>}
      {data && (
        <>
          <FitVerdict vonis={data.fit.verdict} />
          <ul className="space-y-3">
            {data.fit.checks.map((c) => (
              <FitCheckRow key={c.name} cek={c} />
            ))}
          </ul>
          <p className="text-xs text-[#56657A] leading-relaxed">{data.fit.basis}</p>
        </>
      )}
    </div>
  );
}
