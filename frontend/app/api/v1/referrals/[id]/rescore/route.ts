import type { IdParams } from "../../../../../../types/route";
import { ID_AMAN, keBackendSebagai, tolak, wajibPetugas } from "../../../../../../lib/auth/guard";

const JEJAK = { resource: "referral", action: "rescore" } as const;

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params;
  const cek = await wajibPetugas(request, true, JEJAK, id);
  if ("galat" in cek) return cek.galat;
  if (!ID_AMAN.test(id)) return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid", id);
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}/rescore`, { method: "POST" });
}
