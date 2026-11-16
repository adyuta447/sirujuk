import { saringObjek } from "./saring-objek";
import type { Tipe } from "./saring-objek";

// Hanya masukan yang dipakai model, dan asumsi tentang RS tujuan. Teks bebas (narasi klinis) sengaja tidak ikut.
const MASUKAN: Record<string, Tipe> = {
  diagnosis_code: "string",
  reason_category: "string",
  n90: "number",
  ns90: "number",
  n180: "number",
  hhi180: "number",
  to_dominant_dest: "boolean",
  sisrute_available: "boolean",
  sisrute_age_days: "number",
  dest_is_nearest: "boolean",
};
const TUJUAN: Record<string, Tipe> = { distance_km: "number", competency: "string", equipment_available: "boolean" };

/** Isi POST /simulate yang boleh diteruskan. Field lain dibuang; null bila bentuknya salah. Nilai divalidasi backend. */
export function bersihkanSimulasi(mentah: string): string | null {
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(mentah);
  } catch {
    return null;
  }
  if (typeof b !== "object" || b === null) return null;
  const inputs = saringObjek(b.inputs ?? {}, MASUKAN);
  if (!inputs) return null;
  const keluar: Record<string, unknown> = { inputs };
  if (b.base_referral_id !== undefined) {
    if (typeof b.base_referral_id !== "string") return null;
    keluar.base_referral_id = b.base_referral_id;
  }
  if (b.destination !== undefined) {
    const tujuan = saringObjek(b.destination, TUJUAN);
    if (!tujuan) return null;
    keluar.destination = tujuan;
  }
  return JSON.stringify(keluar);
}
