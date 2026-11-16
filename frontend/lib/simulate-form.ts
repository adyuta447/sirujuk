import type { FormSimulasi } from "../types/simulate-form";
import type { MasukanModel, PermintaanSimulasi, TujuanSimulasi } from "../types/simulate";
import { angkaForm } from "./angka-form";
import { DIAGNOSIS, ID } from "./validate";

const KOMPETENSI = ["sesuai", "sebagian", "tidak"] as const;
const ALASAN = ["clinical", "equipment", "staff"];
const YA: Record<string, boolean | undefined> = { "": undefined, ya: true, tidak: false };

/** Menyusun permintaan simulasi dari isian. Backend tetap memvalidasi ulang; ini hanya agar galatnya jelas. */
export function bangunPermintaanSimulasi(f: FormSimulasi): { input: PermintaanSimulasi } | { galat: string } {
  const baseId = f.baseId.trim();
  if (baseId && !ID.test(baseId)) return { galat: "ID rujukan dasar tidak valid." };
  const diagnosis = f.diagnosis.trim();
  if (diagnosis && !DIAGNOSIS.test(diagnosis)) return { galat: "Kode diagnosis tidak valid." };
  if (!baseId && (!diagnosis || !ALASAN.includes(f.alasan))) {
    return { galat: "Tanpa rujukan dasar, isi kode diagnosis dan kategori alasan." };
  }
  const ns90 = angkaForm(f.ns90, 0, 100);
  const nilai = { n90: angkaForm(f.n90, 0, 1e6, true), n180: angkaForm(f.n180, 0, 1e6, true), hhi180: angkaForm(f.hhi180, 0, 10000), jarak: angkaForm(f.jarak, 0, 2000) };
  if (Number.isNaN(ns90) || Object.values(nilai).some(Number.isNaN)) return { galat: "Ada angka di luar rentang yang diizinkan." };

  const inputs: MasukanModel = {
    diagnosis_code: diagnosis || undefined,
    reason_category: f.alasan || undefined,
    n90: nilai.n90,
    ns90: ns90 === undefined ? undefined : ns90 / 100,
    n180: nilai.n180,
    hhi180: nilai.hhi180,
    to_dominant_dest: YA[f.dominan],
    sisrute_available: YA[f.sisrute],
  };
  const destination: TujuanSimulasi = {
    distance_km: nilai.jarak,
    competency: KOMPETENSI.find((k) => k === f.kompetensi),
    equipment_available: YA[f.alat],
  };
  const ada = (o: object) => Object.values(o).some((v) => v !== undefined);
  return {
    input: {
      ...(baseId && { base_referral_id: baseId }),
      inputs: Object.fromEntries(Object.entries(inputs).filter(([, v]) => v !== undefined)),
      ...(ada(destination) && { destination: Object.fromEntries(Object.entries(destination).filter(([, v]) => v !== undefined)) }),
    },
  };
}
