import { json, keBackendSebagai, wajibPeran } from "../../../../lib/auth/guard";
import { bolehSkor } from "../../../../lib/akses";

// Hanya parameter ini yang diteruskan ke backend, dengan panjang dibatasi. Nilainya divalidasi backend (400 bila buruk).
const PARAMETER = ["limit", "cursor", "risk", "status", "wilayah", "q"];
const MAKS_PANJANG = 512;

// Daftar rujukan memuat data pasien. Petugas melihat semua; dokter hanya rujukannya sendiri (backend menyaring
// lewat doctor_id akun); Dinkes tidak mendapat baris pasien sama sekali.
export async function GET(request: Request) {
  const cek = await wajibPeran(request, (peran) => bolehSkor(peran) || peran === "dokter", false);
  if ("galat" in cek) return cek.galat;
  const masuk = new URL(request.url).searchParams;
  const keluar = new URLSearchParams();
  for (const k of PARAMETER) {
    const v = masuk.get(k);
    if (v === null) continue;
    if (v.length > MAKS_PANJANG) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
    keluar.set(k, v);
  }
  return keBackendSebagai(cek.sesi, `/api/v1/referrals${keluar.size ? `?${keluar}` : ""}`);
}
