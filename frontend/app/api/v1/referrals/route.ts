import { keBackendSebagai, wajibPeran } from "../../../../lib/auth/guard";
import { bolehSkor } from "../../../../lib/akses";

// Daftar rujukan memuat data pasien. Petugas melihat semua; dokter hanya rujukannya sendiri (backend menyaring
// lewat doctor_id akun); Dinkes tidak mendapat baris pasien sama sekali.
export async function GET(request: Request) {
  const cek = await wajibPeran(request, (peran) => bolehSkor(peran) || peran === "dokter", false);
  if ("galat" in cek) return cek.galat;
  return keBackendSebagai(cek.sesi, "/api/v1/referrals");
}
