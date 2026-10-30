import type { Indikator } from "./sirujuk-data";
import type { RiskDecision } from "../types/referral";
import { angka } from "./indikator-angka";
import { dipicu } from "./indikator-dipicu";
import { levelHhi } from "./indikator-level-hhi";

const NLP_RENDAH = 0.5;
const SISRUTE_USANG_HARI = 30;

/** Cadangan: indikator dari fitur dokter dan sinyal bila angka mentah tidak ada. */
export function bangunIndikatorFitur(decision: RiskDecision): Indikator[] {
  const f = decision.features;
  if (!f) return [];
  const { ns90, n90, hhi180, n180 } = f.doctor;
  const sisrute: Indikator = {
    label: "Alat/SDM di faskes asal (SISRUTE)",
    nilai: f.sisrute_available ? "Tersedia" : "Tidak tersedia",
    banding: `Data diperbarui ${angka(f.sisrute_age_days)} hari lalu${f.sisrute_age_days > SISRUTE_USANG_HARI ? ", jadi bobotnya rendah" : ""}.`,
    level:
      f.sisrute_available && dipicu(decision, "FACILITY_AVAILABLE_PER_SISRUTE")
        ? "tinggi"
        : "rendah",
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
      banding:
        nlp < NLP_RENDAH
          ? "Narasinya terlalu umum dibanding panduan klinis."
          : "Narasi sesuai panduan klinis.",
      level: dipicu(decision, "NARRATIVE_GENERIC") ? "sedang" : "rendah",
    },
  ];
}
