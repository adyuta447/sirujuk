import { NAMA_PERAN, PERAN } from "../../../../lib/akses";
import type { Peran } from "../../../../lib/akses";
import { EMAIL_DEMO, TTL_DEMO_DETIK } from "../../../../lib/auth/demo";
import { galatAuth } from "../../../../lib/auth/galat-auth";
import { asalSama } from "../../../../lib/auth/origin";
import { demoAktif, rahasia } from "../../../../lib/auth/session";
import { terbitkanSesi } from "../../../../lib/auth/terbitkan-sesi";

export async function POST(request: Request) {
  if (!demoAktif()) return galatAuth(404, "NOT_FOUND", "Tidak ditemukan.");
  if (!asalSama(request)) return galatAuth(403, "FORBIDDEN", "Permintaan ditolak.");
  const kunci = rahasia();
  if (!kunci) return galatAuth(503, "AUTH_NOT_CONFIGURED", "Login belum dikonfigurasi di server.");

  let peran = "";
  try {
    const b = JSON.parse((await request.text()).slice(0, 512));
    peran = typeof b.peran === "string" ? b.peran : "";
  } catch {
    return galatAuth(400, "INVALID_REQUEST", "Permintaan tidak valid.");
  }
  if (!PERAN.includes(peran as Peran)) return galatAuth(400, "INVALID_REQUEST", "Peran tidak dikenal.");

  const role = peran as Peran;
  return terbitkanSesi({ sub: EMAIL_DEMO[role], nama: `Demo, ${NAMA_PERAN[role]}`, role }, TTL_DEMO_DETIK, kunci);
}
