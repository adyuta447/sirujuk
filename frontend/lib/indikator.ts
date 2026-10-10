import type { Indikator, RiskLevel } from "./sirujuk-data";
import type { RiskDecision } from "../types/referral";

const HHI_PERLU_KLARIFIKASI = 2500;
const HHI_OBSERVASI = 1500;
const NLP_RENDAH = 0.5;
const SISRUTE_USANG_HARI = 30;

const angka = (n: number, digit = 0) => n.toLocaleString("id-ID", { maximumFractionDigits: digit });
const dipicu = (decision: RiskDecision, ...kode: string[]) => (decision.reason_codes ?? []).some((k) => kode.includes(k));

function levelHhi(hhi: number): RiskLevel {
  if (hhi > HHI_PERLU_KLARIFIKASI) return "tinggi";
  return hhi >= HHI_OBSERVASI ? "sedang" : "rendah";
}

/** Empat indikator dari angka yang benar-benar dipakai ML (features + signals). Frontend tidak menghitung skor. */
export function bangunIndikator(decision: RiskDecision): Indikator[] {
  const ind = decision.indicators;
  if (ind?.ns && ind.hhi && ind.sisrute && ind.narrative) {
    const { ns, hhi, sisrute, narrative } = ind;
    return [
      {
        label: "Rujukan keluhan ringan (NS)",
        nilai: ns.value === null || !ns.applies ? "Belum cukup data" : `${angka(ns.value * 100)}%`,
        banding: ns.peer_p95 === null ? `Dari ${ns.n} rujukan (minimal ${ns.min_n}).` : `Dokter sejenis P95: ${angka(ns.peer_p95 * 100)}%. Dari ${ns.n} rujukan (minimal ${ns.min_n}).`,
        level: dipicu(decision, "NS_ABOVE_PEER_P95") ? "tinggi" : "rendah",
      },
      {
        label: "Konsentrasi rumah sakit tujuan (HHI)",
        nilai: hhi.value === null ? "Belum cukup data" : angka(hhi.value),
        banding: `Dari ${hhi.n} rujukan${hhi.min_n ? ` (minimal ${hhi.min_n})` : ""}. Observasi mulai ${angka(hhi.observe_from)}, perlu klarifikasi mulai ${angka(hhi.high_from)}.${hhi.nearest_known === false ? " Jarak faskes belum diketahui, jadi konsentrasi belum bisa dinilai adil." : ""}`,
        level: hhi.value === null ? "rendah" : hhi.value > hhi.high_from ? "tinggi" : hhi.value >= hhi.observe_from ? "sedang" : "rendah",
      },
      {
        label: "Alat/SDM di faskes asal (SISRUTE)",
        nilai: sisrute.flag ? "Tersedia" : "Tidak tersedia",
        banding: `Data diperbarui ${angka(sisrute.age_days)} hari lalu (bobot ${angka(sisrute.weight, 2)}).`,
        level: sisrute.flag && dipicu(decision, "FACILITY_AVAILABLE_PER_SISRUTE") ? "tinggi" : "rendah",
      },
      {
        label: "Kesesuaian narasi dokter (NLP)",
        nilai: angka(narrative.similarity, 2),
        banding: narrative.p10 === null ? "Dibanding panduan klinis." : `Batas bawah wajar (P10): ${angka(narrative.p10, 2)}.`,
        level: dipicu(decision, "NARRATIVE_GENERIC") ? "sedang" : "rendah",
      },
    ];
  }
  const f = decision.features;
  if (!f) return [];
  const { ns90, n90, hhi180, n180 } = f.doctor;
  const sisrute: Indikator = {
    label: "Alat/SDM di faskes asal (SISRUTE)",
    nilai: f.sisrute_available ? "Tersedia" : "Tidak tersedia",
    banding: `Data diperbarui ${angka(f.sisrute_age_days)} hari lalu${f.sisrute_age_days > SISRUTE_USANG_HARI ? ", jadi bobotnya rendah" : ""}.`,
    level: f.sisrute_available && dipicu(decision, "FACILITY_AVAILABLE_PER_SISRUTE") ? "tinggi" : "rendah",
  };
  const nlp = decision.signals.nlp_similarity;
  return [
    {
      label: "Rujukan keluhan ringan (NS)",
      nilai: ns90 === null ? "Belum cukup data" : `${angka(ns90 * 100)}%`,
      banding: `Dari ${n90} rujukan dokter ini dalam 90 hari (minimal 20).`,
      level: dipicu(decision, "NS_ABOVE_PEER_P95") ? "tinggi" : "rendah",
    },
    {
      label: "Konsentrasi rumah sakit tujuan (HHI)",
      nilai: hhi180 === null ? "Belum cukup data" : angka(hhi180),
      banding: `Dari ${n180} rujukan dalam 180 hari (minimal 30). Wajar < 1.500, perlu klarifikasi > 2.500.`,
      level: hhi180 === null ? "rendah" : levelHhi(hhi180),
    },
    sisrute,
    {
      label: "Kesesuaian narasi dokter (NLP)",
      nilai: angka(nlp, 2),
      banding: nlp < NLP_RENDAH ? "Narasinya terlalu umum dibanding panduan klinis." : "Narasi sesuai panduan klinis.",
      level: dipicu(decision, "NARRATIVE_GENERIC") ? "sedang" : "rendah",
    },
  ];
}
