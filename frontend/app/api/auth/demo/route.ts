import { NextResponse } from "next/server";
import { NAMA_PERAN, PERAN, RUMAH } from "../../../../lib/akses";
import type { Peran } from "../../../../lib/akses";
import { asalSama } from "../../../../lib/auth/origin";
import { COOKIE, demoAktif, opsiCookie, rahasia } from "../../../../lib/auth/session";
import { buatToken } from "../../../../lib/auth/token";

// Akun demo: hanya aktif bila DEMO_MODE=true di server (default mati) dan bukan deployment produksi (lihat demoAktif). Tetap lewat sesi bertanda tangan
// dan pembatasan peran yang sama; bedanya tanpa kata sandi, dan masa berlaku lebih pendek.
const TTL_DEMO_DETIK = 2 * 60 * 60;

// Harus sama dengan akun yang disiapkan backend (backend-go/internal/seed/demo_users.go, DEMO_ACCOUNTS=true):
// backend mencari pelaku dari X-Actor di daftar akunnya, jadi sub palsu seperti "demo-<peran>" ditolak sebagai tak dikenal.
const EMAIL_DEMO: Record<Peran, string> = {
  verifikator: "verifikator@demo.sirujuk.id",
  tkmkb: "tkmkb@demo.sirujuk.id",
  dinkes: "dinkes@demo.sirujuk.id",
  dokter: "dokter@demo.sirujuk.id",
};

const galat = (status: number, code: string, message: string) =>
  NextResponse.json({ code, message }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!demoAktif()) return galat(404, "NOT_FOUND", "Tidak ditemukan.");
  if (!asalSama(request)) return galat(403, "FORBIDDEN", "Permintaan ditolak.");
  const kunci = rahasia();
  if (!kunci) return galat(503, "AUTH_NOT_CONFIGURED", "Login belum dikonfigurasi di server.");

  let peran = "";
  try {
    const b = JSON.parse((await request.text()).slice(0, 512));
    peran = typeof b.peran === "string" ? b.peran : "";
  } catch {
    return galat(400, "INVALID_REQUEST", "Permintaan tidak valid.");
  }
  if (!PERAN.includes(peran as Peran)) return galat(400, "INVALID_REQUEST", "Peran tidak dikenal.");

  const role = peran as Peran;
  const exp = Math.floor(Date.now() / 1000) + TTL_DEMO_DETIK;
  const token = await buatToken({ sub: EMAIL_DEMO[role], nama: `Demo, ${NAMA_PERAN[role]}`, role, exp }, kunci);
  const res = NextResponse.json({ tujuan: RUMAH[role] }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(COOKIE, token, { ...opsiCookie, maxAge: TTL_DEMO_DETIK });
  return res;
}
