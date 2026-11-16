import { bersihkanSimulasi } from "../../../../lib/auth/bersihkan-simulasi";
import { bacaBody, keBackendSebagai, tolak, wajibPetugas } from "../../../../lib/auth/guard";

const JEJAK = { resource: "simulation", action: "simulate" } as const;

/**
 * Simulasi what-if pada model yang sama dengan skor asli. Hanya petugas. Tidak menyimpan apa pun; hanya masukan
 * model dan asumsi tujuan yang diteruskan.
 */
export async function POST(request: Request) {
  const cek = await wajibPetugas(request, true, JEJAK);
  if ("galat" in cek) return cek.galat;
  const mentah = await bacaBody(request, 8 * 1024);
  const body = mentah === null ? null : bersihkanSimulasi(mentah);
  if (body === null) return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid");
  return keBackendSebagai(cek.sesi, "/api/v1/simulate", { method: "POST", body });
}
