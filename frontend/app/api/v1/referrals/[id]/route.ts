import type { IdParams } from "../../../../../types/route";
import { bolehSkor } from "../../../../../lib/akses";
import { ID_AMAN, bacaBody, keBackendSebagai, tolak, wajibPeran, wajibPetugas, wajibTingkat } from "../../../../../lib/auth/guard";

const BACA = { resource: "referral", action: "read" } as const;
const UBAH = { resource: "referral", action: "update" } as const;
const ARSIP = { resource: "referral", action: "delete" } as const;
const TOLAK_400 = "Permintaan tidak valid";

/** Satu rujukan. Petugas boleh; dokter hanya miliknya (backend menyaring lewat akun); Dinkes tidak. Redaksi di backend. */
export async function GET(request: Request, { params }: IdParams) {
  const { id } = await params;
  const cek = await wajibPeran(request, (peran) => bolehSkor(peran) || peran === "dokter", false, BACA, id);
  if ("galat" in cek) return cek.galat;
  if (!ID_AMAN.test(id)) return tolak(cek.sesi, BACA, 400, "INVALID_REQUEST", TOLAK_400, id);
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}`);
}

/** Ubah isi rujukan lalu hitung ulang lewat ML. Backend menolak bila ML tidak tersedia, skor lama tetap. */
export async function PUT(request: Request, { params }: IdParams) {
  const { id } = await params;
  const cek = await wajibPetugas(request, true, UBAH, id);
  if ("galat" in cek) return cek.galat;
  const mentah = await bacaBody(request, 16 * 1024);
  if (!ID_AMAN.test(id) || mentah === null) return tolak(cek.sesi, UBAH, 400, "INVALID_REQUEST", TOLAK_400, id);
  // Hanya isi klinis yang diteruskan: dokter dan faskes tidak boleh diubah lewat jalur ini, apa pun isi body-nya.
  let body: string;
  try {
    const { diagnosis_code, reason, clinical_narrative } = JSON.parse(mentah);
    body = JSON.stringify({ diagnosis_code, reason, clinical_narrative });
  } catch {
    return tolak(cek.sesi, UBAH, 400, "INVALID_REQUEST", TOLAK_400, id);
  }
  // Tanpa ini verifikator bisa mengubah bukti rujukan merah sampai skornya turun, lalu memprosesnya sendiri.
  const ditolak = await wajibTingkat(cek.sesi, id, UBAH);
  if (ditolak) return ditolak;
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}`, { method: "PUT", body });
}

/** Arsip (bukan hapus permanen) dan hanya TKMKB: skor dan audit harus tetap ada untuk banding. */
export async function DELETE(request: Request, { params }: IdParams) {
  const { id } = await params;
  const cek = await wajibPeran(request, (peran) => peran === "tkmkb", true, ARSIP, id);
  if ("galat" in cek) return cek.galat;
  const body = await bacaBody(request, 8 * 1024);
  if (!ID_AMAN.test(id) || body === null) return tolak(cek.sesi, ARSIP, 400, "INVALID_REQUEST", TOLAK_400, id);
  let note = "";
  try {
    note = String(JSON.parse(body).note ?? "").trim();
  } catch {
    return tolak(cek.sesi, ARSIP, 400, "INVALID_REQUEST", TOLAK_400, id);
  }
  // Pelaku diambil dari sesi, bukan dari body.
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ reviewer: cek.sesi.nama, note }),
  });
}
