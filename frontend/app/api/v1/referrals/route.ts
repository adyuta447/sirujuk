import { keBackend, wajibPetugas } from "../../../../lib/auth/guard";

// Daftar rujukan memuat data pasien: hanya petugas yang sudah masuk.
export async function GET(request: Request) {
  const cek = await wajibPetugas(request, false);
  if ("galat" in cek) return cek.galat;
  return keBackend("/api/v1/referrals");
}
