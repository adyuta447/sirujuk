import { keBackendSebagai, wajibPeran } from "../../../../lib/auth/guard";
import { bolehSkor } from "../../../../lib/akses";

// Dinkes hanya melihat agregat wilayah. Statistik per dokter hanya untuk petugas.
export async function GET(request: Request) {
  const cek = await wajibPeran(request, (peran) => bolehSkor(peran) || peran === "dinkes", false);
  if ("galat" in cek) return cek.galat;
  const upstream = await keBackendSebagai(cek.sesi, "/api/v1/stats");
  if (cek.sesi.role !== "dinkes" || !upstream.ok) return upstream;
  const { wilayah, synthetic, source } = await upstream.json(); // penanda asal data ikut, supaya banner tetap tampil
  return Response.json({ wilayah, dokter: [], synthetic, source },{ headers: { "Cache-Control": "no-store" } });
}
