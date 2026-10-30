import { bacaLogin } from "../../../../lib/auth/baca-login";
import { galatAuth } from "../../../../lib/auth/galat-auth";
import { asalSama } from "../../../../lib/auth/origin";
import { buatPembatas, kunciPercobaan } from "../../../../lib/auth/pembatas";
import { TTL_DETIK, rahasia } from "../../../../lib/auth/session";
import { terbitkanSesi } from "../../../../lib/auth/terbitkan-sesi";
import { TerlaluBanyak, verifikasi } from "../../../../lib/auth/users";

const pembatas = buatPembatas(5, 15 * 60 * 1000, 5000);
const TERLALU_BANYAK = "Terlalu banyak percobaan. Coba lagi 15 menit lagi.";

export async function POST(request: Request) {
  if (!asalSama(request)) return galatAuth(403, "FORBIDDEN", "Permintaan ditolak.");
  const kunciRahasia = rahasia();
  if (!kunciRahasia) return galatAuth(503, "AUTH_NOT_CONFIGURED", "Login belum dikonfigurasi di server.");

  const mentah = await request.text();
  if (mentah.length > 2048) return galatAuth(413, "PAYLOAD_TOO_LARGE", "Permintaan terlalu besar.");
  const kredensial = bacaLogin(mentah);
  if (!kredensial) return galatAuth(400, "INVALID_REQUEST", "Permintaan tidak valid.");
  const { email, sandi } = kredensial;
  if (!email || !sandi) return galatAuth(400, "INVALID_REQUEST", "Email dan kata sandi wajib diisi.");

  const kunci = kunciPercobaan(email, request.headers);
  if (pembatas.tertahan(kunci)) {
    return galatAuth(429, "TOO_MANY_ATTEMPTS", TERLALU_BANYAK, { "Retry-After": String(pembatas.sisaDetik(kunci)) });
  }

  let user;
  try {
    user = await verifikasi(email, sandi);
  } catch (e) {
    if (e instanceof TerlaluBanyak) return galatAuth(429, "TOO_MANY_ATTEMPTS", TERLALU_BANYAK);
    return galatAuth(503, "AUTH_UNAVAILABLE", "Layanan login sedang tidak tersedia. Coba lagi sebentar.");
  }
  if (!user) {
    pembatas.catatGagal(kunci);
    // Pesan sama untuk email tak dikenal dan sandi salah.
    return galatAuth(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah.");
  }
  pembatas.hapus(kunci);

  return terbitkanSesi({ sub: user.email, nama: user.nama, role: user.role }, TTL_DETIK, kunciRahasia);
}
