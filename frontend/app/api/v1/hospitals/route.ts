import { bolehSkor } from "../../../../lib/akses";
import { json, keBackendSebagai, wajibPeran } from "../../../../lib/auth/guard";

const JENIS = ["umum", "khusus", "klinik_utama"];

/** Direktori RS tujuan: petugas dan Dinkes. Dokter tidak. Hanya kind dan wilayah yang diteruskan. */
export async function GET(request: Request) {
  const cek = await wajibPeran(request, (peran) => bolehSkor(peran) || peran === "dinkes", false);
  if ("galat" in cek) return cek.galat;
  const masuk = new URL(request.url).searchParams;
  const kind = masuk.get("kind");
  const wilayah = masuk.get("wilayah");
  if ((kind !== null && !JENIS.includes(kind)) || (wilayah !== null && wilayah.length > 64)) {
    return json(400, "INVALID_REQUEST", "Permintaan tidak valid");
  }
  const keluar = new URLSearchParams();
  if (kind) keluar.set("kind", kind);
  if (wilayah) keluar.set("wilayah", wilayah);
  return keBackendSebagai(cek.sesi, `/api/v1/hospitals${keluar.size ? `?${keluar}` : ""}`);
}
