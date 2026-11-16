import { KATEGORI_RISIKO } from "../../../data/kategori-risiko";
import { useRiskConfigForm } from "../../../hooks/useRiskConfigForm";
import type { KonfigRisiko } from "../../../types/risk-config";
import { Card } from "../../atoms/Card";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { SecondaryButton } from "../../atoms/SecondaryButton";
import { TitledCard } from "../../molecules/TitledCard";
import { BandPreview } from "./BandPreview";
import { CategoryActionRow } from "./CategoryActionRow";
import { ConfigMeta } from "./ConfigMeta";
import { CutoffFields } from "./CutoffFields";
import { ImpactPreview } from "./ImpactPreview";

interface RiskConfigFormProps {
  konfig: KonfigRisiko;
  bisaUbah: boolean;
}

export function RiskConfigForm({ konfig, bisaUbah }: RiskConfigFormProps) {
  const f = useRiskConfigForm(konfig);
  return (
    <>
      <TitledCard title="Batas kategori">
        <div className="mt-3 space-y-4">
          <ConfigMeta konfig={konfig} />
          <CutoffFields yellow={f.yellow} red={f.red} disabled={!bisaUbah} onYellow={f.setYellow} onRed={f.setRed} />
          <BandPreview yellow={Number(f.yellow)} red={Number(f.red)} />
        </div>
      </TitledCard>
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE3EC]">
          <div className="font-bold text-[#0E1B2A]">Rekomendasi tindakan</div>
          <div className="text-xs text-[#56657A] mt-0.5">Yang disarankan sistem untuk tiap kategori, dan apakah kategori itu memunculkan peringatan.</div>
        </div>
        <ul className="divide-y divide-[#EEF1F5]">
          {KATEGORI_RISIKO.map((k) => (
            <CategoryActionRow key={k.key} label={k.label} level={k.level} aksi={f.actions[k.key]} bisaUbah={bisaUbah} onChange={(a) => f.setAksi(k.key, a)} />
          ))}
        </ul>
      </Card>
      {f.dampak && <ImpactPreview dampak={f.dampak} />}
      {f.galat && <p role="alert" className="text-sm text-[#9B1C1C]">{f.galat}</p>}
      {f.tersimpan && <p role="status" className="text-sm font-semibold text-[#17803F]">Pengaturan disimpan.</p>}
      {bisaUbah ? (
        <div className="flex flex-wrap gap-3">
          <SecondaryButton onClick={f.hitungDampak} disabled={f.sibuk}>Lihat dampak</SecondaryButton>
          <PrimaryButton onClick={f.simpan} disabled={f.sibuk || !f.dampak} className="px-5 py-3">Simpan pengaturan</PrimaryButton>
        </div>
      ) : (
        <p role="note" className="text-sm text-[#56657A]">Hanya anggota TKMKB yang dapat mengubah pengaturan ini.</p>
      )}
    </>
  );
}
