import type { Indikator } from "./sirujuk-data";
import type { RiskDecision } from "../types/referral";
import { angka } from "./indikator-angka";
import { dipicu } from "./indikator-dipicu";

/** Indikator dari angka mentah ML; null bila backend belum meneruskan keempatnya. */
export function bangunIndikatorRinci(
  decision: RiskDecision,
): Indikator[] | null {
  const ind = decision.indicators;
  if (!(ind?.ns && ind.hhi && ind.sisrute && ind.narrative)) return null;
  const { ns, hhi, sisrute, narrative } = ind;
  return [
    {
      label: "Rujukan keluhan ringan (NS)",
      nilai:
        ns.value === null || !ns.applies
          ? "Belum cukup data"
          : `${angka(ns.value * 100)}%`,
      banding:
        ns.peer_p95 === null
          ? `Dari ${ns.n} rujukan (minimal ${ns.min_n}).`
          : `Dokter sejenis P95: ${angka(ns.peer_p95 * 100)}%. Dari ${ns.n} rujukan (minimal ${ns.min_n}).`,
      level: dipicu(decision, "NS_ABOVE_PEER_P95") ? "tinggi" : "rendah",
    },
    {
      label: "Konsentrasi rumah sakit tujuan (HHI)",
      nilai: hhi.value === null ? "Belum cukup data" : angka(hhi.value),
      banding: `Dari ${hhi.n} rujukan${hhi.min_n ? ` (minimal ${hhi.min_n})` : ""}. Observasi mulai ${angka(hhi.observe_from)}, perlu klarifikasi mulai ${angka(hhi.high_from)}.${hhi.nearest_known === false ? " Jarak faskes belum diketahui, jadi konsentrasi belum bisa dinilai adil." : ""}`,
      level:
        hhi.value === null
          ? "rendah"
          : hhi.value > hhi.high_from
            ? "tinggi"
            : hhi.value >= hhi.observe_from
              ? "sedang"
              : "rendah",
    },
    {
      label: "Alat/SDM di faskes asal (SISRUTE)",
      nilai: sisrute.flag ? "Tersedia" : "Tidak tersedia",
      banding: `Data diperbarui ${angka(sisrute.age_days)} hari lalu (bobot ${angka(sisrute.weight, 2)}).`,
      level:
        sisrute.flag && dipicu(decision, "FACILITY_AVAILABLE_PER_SISRUTE")
          ? "tinggi"
          : "rendah",
    },
    {
      label: "Kesesuaian narasi dokter (NLP)",
      // null: tidak dinilai (narasi tidak tercatat, atau diagnosis di luar tabel PPK)
      nilai:
        narrative.similarity === null
          ? "Tidak dinilai"
          : angka(narrative.similarity, 2),
      banding:
        narrative.p10 === null
          ? "Dibanding panduan klinis."
          : `Batas bawah wajar (P10): ${angka(narrative.p10, 2)}.`,
      level: dipicu(decision, "NARRATIVE_GENERIC") ? "sedang" : "rendah",
    },
  ];
}
