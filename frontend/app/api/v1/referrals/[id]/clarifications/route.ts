import { ID_AMAN, bacaBody, json, keBackendSebagai, wajibPeran } from "../../../../../../lib/auth/guard";

// shortcut: semua dokter bisa menjawab rujukan mana pun; batasi ke dokter pemilik rujukan setelah akun terhubung ke doctor_id.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cek = await wajibPeran(request, (peran) => peran !== "dinkes", true);
  if ("galat" in cek) return cek.galat;
  const { id } = await params;
  const body = await bacaBody(request, 8 * 1024);
  if (!ID_AMAN.test(id) || body === null) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  let text = "";
  try {
    text = String(JSON.parse(body).text ?? "");
  } catch {
    return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  }
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}/clarifications`, {
    method: "POST",
    body: JSON.stringify({ author: cek.sesi.nama, text }),
  });
}
