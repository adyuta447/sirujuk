import { bolehSkor } from "../../../../../lib/akses";
import { bersihkanKonfig } from "../../../../../lib/auth/bersihkan-konfig";
import { bacaBody, json, keBackendSebagai, wajibPeran } from "../../../../../lib/auth/guard";

/** Batas kategori nasional: petugas dan Dinkes boleh melihat. Dokter tidak. */
export async function GET(request: Request) {
  const cek = await wajibPeran(request, (peran) => bolehSkor(peran) || peran === "dinkes", false);
  if ("galat" in cek) return cek.galat;
  return keBackendSebagai(cek.sesi, "/api/v1/config/risk");
}

/**
 * Ubah batas kategori: hanya TKMKB, karena batas ini menentukan klaim mana yang ditahan. ?dry_run=true hanya
 * menghitung dampak. Pelaku datang dari sesi, bukan dari body.
 */
export async function PUT(request: Request) {
  const cek = await wajibPeran(request, (peran) => peran === "tkmkb", true);
  if ("galat" in cek) return cek.galat;
  const mentah = await bacaBody(request, 8 * 1024);
  const param = new URL(request.url).searchParams.get("dry_run");
  // Nilai selain "true" (mis. TRUE, 1) tidak boleh diam-diam menjadi simpan sungguhan: tolak.
  if (param !== null && param !== "true") return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  const dry = param === "true";
  const body = mentah === null ? null : bersihkanKonfig(mentah, dry);
  if (body === null) return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  return keBackendSebagai(cek.sesi, `/api/v1/config/risk${dry ? "?dry_run=true" : ""}`, { method: "PUT", body });
}
