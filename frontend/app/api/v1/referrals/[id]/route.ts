import type { IdParams } from "../../../../../types/route";
import { ID_AMAN, bacaBody, json, keBackendSebagai, wajibPeran, wajibPetugas, wajibTingkat } from "../../../../../lib/auth/guard";

/** Ubah isi rujukan lalu hitung ulang lewat ML. Backend menolak bila ML tidak tersedia, skor lama tetap. */
export async function PUT(request: Request, { params }: IdParams) {
  const cek = await wajibPetugas(request, true);
  if ("galat" in cek) return cek.galat;
  const { id } = await params;
  const body = await bacaBody(request, 16 * 1024);
  if (!ID_AMAN.test(id) || body === null) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  // Tanpa ini verifikator bisa mengubah bukti rujukan merah sampai skornya turun, lalu memprosesnya sendiri.
  const ditolak = await wajibTingkat(cek.sesi, id);
  if (ditolak) return ditolak;
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}`, { method: "PUT", body });
}

/** Arsip (bukan hapus permanen) dan hanya TKMKB: skor dan audit harus tetap ada untuk banding. */
export async function DELETE(request: Request, { params }: IdParams) {
  const cek = await wajibPeran(request, (peran) => peran === "tkmkb", true);
  if ("galat" in cek) return cek.galat;
  const { id } = await params;
  const body = await bacaBody(request, 8 * 1024);
  if (!ID_AMAN.test(id) || body === null) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  let note = "";
  try {
    note = String(JSON.parse(body).note ?? "").trim();
  } catch {
    return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  }
  // Pelaku diambil dari sesi, bukan dari body.
  return keBackendSebagai(cek.sesi, `/api/v1/referrals/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ reviewer: cek.sesi.nama, note }),
  });
}
