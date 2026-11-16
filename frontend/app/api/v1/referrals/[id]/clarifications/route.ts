import type { IdParams } from "../../../../../../types/route";
import { ID_AMAN, bacaBody, keBackendSebagai, tolak, wajibPeran } from "../../../../../../lib/auth/guard";

const JEJAK = { resource: "clarification", action: "create" } as const;

// shortcut: semua dokter bisa menjawab rujukan mana pun; batasi ke dokter pemilik rujukan setelah akun terhubung ke doctor_id.
export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params;
  const cek = await wajibPeran(request, (peran) => peran !== "dinkes", true, JEJAK, id);
  if ("galat" in cek) return cek.galat;
  const body = await bacaBody(request, 8 * 1024);
  if (!ID_AMAN.test(id) || body === null) return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid", id);
  let text = "";
  try {
    text = String(JSON.parse(body).text ?? "");
  } catch {
    return tolak(cek.sesi, JEJAK, 400, "INVALID_REQUEST", "Permintaan tidak valid", id);
  }
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}/clarifications`, {
    method: "POST",
    body: JSON.stringify({ author: cek.sesi.nama, text }),
  });
}
