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
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <div className="text-xs font-semibold text-[#56657A] mb-1.5">Kesimpulan</div>
          {data ? <FitVerdict vonis={data.fit.verdict} /> : <span className="text-sm text-[#64748B]">…</span>}
        </div>
        <NumberField label="Jarak ke RS tujuan (km)" value={jarak} onChange={setJarak} min={0} max={2000} placeholder="Opsional" />
      </div>
      {isLoading && <p role="status" className="text-sm text-[#56657A]">Memuat penilaian tujuan…</p>}
      {isError && <p role="alert" className="text-sm text-[#9B1C1C]">Penilaian tujuan gagal dimuat.</p>}
      {data && (
        <>
          <ul className="space-y-4">
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
