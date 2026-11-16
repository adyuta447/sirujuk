import { json, keBackendSebagai, wajibPeran } from "../../../../lib/auth/guard";

// Hanya parameter ini yang diteruskan, dengan panjang dibatasi. Nilainya divalidasi backend (400 bila buruk).
const PARAMETER = ["limit", "cursor", "actor", "resource", "action", "outcome", "referral_id"];
const MAKS_PANJANG = 256;

/**
 * Log aktivitas. Semua peran yang sudah masuk boleh membaca; cakupannya ditentukan backend dari sesi: TKMKB melihat
 * entri semua orang, peran lain hanya akunnya sendiri (parameter `actor` diabaikan di sana).
 */
export async function GET(request: Request) {
  const cek = await wajibPeran(request, () => true, false);
  if ("galat" in cek) return cek.galat;
  const masuk = new URL(request.url).searchParams;
  const keluar = new URLSearchParams();
  for (const k of PARAMETER) {
    const v = masuk.get(k);
    if (v === null) continue;
    if (v.length > MAKS_PANJANG) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
    keluar.set(k, v);
  }
  return keBackendSebagai(cek.sesi, `/api/v1/activity${keluar.size ? `?${keluar}` : ""}`);
}
