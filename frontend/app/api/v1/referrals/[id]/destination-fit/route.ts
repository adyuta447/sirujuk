import type { IdParams } from "../../../../../../types/route";
import { ID_AMAN, json, keBackendSebagai, wajibPetugas } from "../../../../../../lib/auth/guard";

const KM = /^\d{1,4}(\.\d{1,2})?$/;

/** Kesesuaian RS tujuan. Hanya petugas; jarak (km) opsional dan hanya faktor sekunder. */
export async function GET(request: Request, { params }: IdParams) {
  const cek = await wajibPetugas(request, false);
  if ("galat" in cek) return cek.galat;
  const { id } = await params;
  const km = new URL(request.url).searchParams.get("distance_km");
  if (!ID_AMAN.test(id) || (km !== null && !KM.test(km))) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  const qs = km === null ? "" : `?distance_km=${encodeURIComponent(km)}`;
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}/destination-fit${qs}`);
}
