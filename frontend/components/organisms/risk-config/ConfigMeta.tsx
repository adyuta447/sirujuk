import type { KonfigRisiko } from "../../../types/risk-config";

interface ConfigMetaProps {
  konfig: KonfigRisiko;
}

export function ConfigMeta({ konfig }: ConfigMetaProps) {
  const { model_reference: acuan } = konfig;
  return (
    <div className="text-xs text-[#56657A] leading-relaxed space-y-1">
      <p>
        {konfig.source === "configured"
          ? `Versi ${konfig.version}, diubah oleh ${konfig.updated_by ?? "tidak tercatat"}${konfig.updated_at ? ` pada ${new Date(konfig.updated_at).toLocaleString("id-ID")}` : ""}.`
          : "Belum pernah diatur: memakai batas bawaan model."}
      </p>
      <p>
        Model dilatih untuk batas {acuan.yellow_from} dan {acuan.red_from}. Mengubah batas tidak mengubah skor atau bobot
        model; hanya kategori dan klaim yang ditahan untuk rujukan yang dinilai sesudahnya. Rujukan lama tetap memakai
        batas saat ia dinilai.
      </p>
    </div>
  );
}
