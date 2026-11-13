import type { IdParams } from "../../../../../../types/route";
import { ID_AMAN, json, keBackendSebagai, wajibPetugas } from "../../../../../../lib/auth/guard";

export async function POST(request: Request, { params }: IdParams) {
  const cek = await wajibPetugas(request, true);
  if ("galat" in cek) return cek.galat;
  const { id } = await params;
  if (!ID_AMAN.test(id)) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}/rescore`, { method: "POST" });
}
