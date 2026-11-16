import type { IdParams } from "../../../../../../types/route";
import { ID_AMAN, keBackendSebagai, tolak, wajibPetugas } from "../../../../../../lib/auth/guard";

const JEJAK = { resource: "referral", action: "read" } as const; // backend mencatatnya sebagai referral.read
const KM = /^\d{1,4}(\.\d{1,2})?$/;

/** Kesesuaian RS tujuan. Hanya petugas; jarak (km) opsional dan hanya faktor sekunder. */
export async function GET(request: Request, { params }: IdParams) {
  const { id } = await params;
  const cek = await wajibPetugas(request, false, JEJAK, id);
  if ("galat" in cek) return cek.galat;
  const km = new URL(request.url).searchParams.get("distance_km");
  if (!ID_AMAN.test(id) || (km !== null && !KM.test(km))) return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid", id);
  const qs = km === null ? "" : `?distance_km=${encodeURIComponent(km)}`;
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}/destination-fit${qs}`);
}
