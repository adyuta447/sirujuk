import type { AksiKategori, InputKonfigRisiko, KategoriRisiko } from "../types/risk-config";

export interface FormKonfig {
  yellow: string;
  red: string;
  actions: Record<KategoriRisiko, AksiKategori>;
  version: number;
}

const JARAK_MIN = 5; // sama dengan backend: kuning minimal 5 poin di bawah merah
const REKOMENDASI_MAKS = 200;

/** Memeriksa isian sebelum dikirim. Backend tetap yang memutuskan; ini agar galatnya jelas dan cepat. */
export function bacaFormKonfig(f: FormKonfig): { input: InputKonfigRisiko } | { galat: string } {
  const yellow = Number(f.yellow);
  const red = Number(f.red);
  if (!f.yellow.trim() || !f.red.trim() || !Number.isFinite(yellow) || !Number.isFinite(red)) {
    return { galat: "Batas kuning dan merah harus berupa angka." };
  }
  if (yellow < 1 || red > 100) return { galat: "Batas harus antara 1 dan 100." };
  if (red - yellow < JARAK_MIN) return { galat: `Batas merah harus minimal ${JARAK_MIN} poin di atas batas kuning.` };
  const actions = {} as Record<KategoriRisiko, AksiKategori>;
  for (const k of Object.keys(f.actions) as KategoriRisiko[]) {
    const teks = f.actions[k].recommendation.trim();
    if (!teks || [...teks].length > REKOMENDASI_MAKS) {
      return { galat: `Rekomendasi tiap kategori wajib diisi, maksimal ${REKOMENDASI_MAKS} karakter.` };
    }
    actions[k] = { recommendation: teks, alert: f.actions[k].alert };
  }
  return { input: { yellow_from: yellow, red_from: red, actions, version: f.version } };
}
