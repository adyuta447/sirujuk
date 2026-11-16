"use client";

import { useSimulation } from "../../hooks/useSimulation";
import { Card } from "../atoms/Card";
import { PageHead } from "../atoms/PageHead";
import { PrimaryButton } from "../atoms/PrimaryButton";
import { SecondaryButton } from "../atoms/SecondaryButton";
import { PageScroll } from "../molecules/PageScroll";
import { DestinationInputs } from "./simulation/DestinationInputs";
import { ModelInputs } from "./simulation/ModelInputs";
import { SimulationResult } from "./simulation/SimulationResult";

export function Simulation() {
  const s = useSimulation();
  return (
    <PageScroll>
      <PageHead title="Simulasi Skor" sub="Coba ubah masukan dan lihat pengaruhnya pada skor. Hasilnya tidak disimpan dan tidak mengubah rujukan mana pun." />
      <Card className="p-5 sm:p-6 space-y-6">
        <ModelInputs form={s.form} onChange={s.ubah} />
        <DestinationInputs form={s.form} onChange={s.ubah} />
        {s.galat && <p role="alert" className="text-sm text-[#9B1C1C]">{s.galat}</p>}
        <div className="flex flex-wrap gap-3">
          <PrimaryButton onClick={s.jalankan} disabled={s.sibuk} className="px-5 py-3">
            {s.sibuk ? "Menghitung…" : "Jalankan simulasi"}
          </PrimaryButton>
          <SecondaryButton onClick={s.reset}>Reset simulasi</SecondaryButton>
        </div>
      </Card>
      {s.hasil && <SimulationResult hasil={s.hasil} />}
    </PageScroll>
  );
}
