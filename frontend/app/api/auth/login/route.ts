import { NextResponse } from "next/server";
import { asalSama } from "../../../../lib/auth/origin";
import { RUMAH } from "../../../../lib/akses";
import { COOKIE, TTL_DETIK, opsiCookie, rahasia } from "../../../../lib/auth/session";
import { buatToken } from "../../../../lib/auth/token";
import { TerlaluBanyak, verifikasi } from "../../../../lib/auth/users";

// shortcut: pembatas percobaan di memori satu instance; pindahkan ke Redis bila server lebih dari satu.
const percobaan = new Map<string, { n: number; reset: number }>();
const BATAS = 5;
const JENDELA_MS = 15 * 60 * 1000;

function tertahan(kunci: string): boolean {
  const p = percobaan.get(kunci);
  if (!p || p.reset < Date.now()) return false;
  return p.n >= BATAS;
}
function sisaDetik(kunci: string): number {
  const p = percobaan.get(kunci);
  if (!p) return 0;
  return Math.max(1, Math.ceil((p.reset - Date.now()) / 1000));
}
function catatGagal(kunci: string) {
  const p = percobaan.get(kunci);
  if (!p || p.reset < Date.now()) percobaan.set(kunci, { n: 1, reset: Date.now() + JENDELA_MS });
  else p.n += 1;
  if (percobaan.size > 5000) percobaan.clear();
}

const galat = (status: number, code: string, message: string, extra?: Record<string, string>) =>
  NextResponse.json({ code, message }, { status, headers: { "Cache-Control": "no-store", ...extra } });

export async function POST(request: Request) {
  if (!asalSama(request)) return galat(403, "FORBIDDEN", "Permintaan ditolak.");
  const kunciRahasia = rahasia();
  if (!kunciRahasia) return galat(503, "AUTH_NOT_CONFIGURED", "Login belum dikonfigurasi di server.");

  const mentah = await request.text();
  if (mentah.length > 2048) return galat(413, "PAYLOAD_TOO_LARGE", "Permintaan terlalu besar.");
  let email = "";
  let sandi = "";
  try {
    const b = JSON.parse(mentah);
    email = typeof b.email === "string" ? b.email.trim().slice(0, 254) : "";
    sandi = typeof b.sandi === "string" ? b.sandi.slice(0, 200) : "";
  } catch {
    return galat(400, "INVALID_REQUEST", "Permintaan tidak valid.");
  }
  if (!email || !sandi) return galat(400, "INVALID_REQUEST", "Email dan kata sandi wajib diisi.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "lokal";
  const kunci = `${ip}|${email.toLowerCase()}`;
  if (tertahan(kunci)) return galat(429, "TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan. Coba lagi 15 menit lagi.", { "Retry-After": String(sisaDetik(kunci)) });

  let user;
  try {
    user = await verifikasi(email, sandi);
  } catch (e) {
    if (e instanceof TerlaluBanyak) return galat(429, "TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan. Coba lagi 15 menit lagi.");
    return galat(503, "AUTH_UNAVAILABLE", "Layanan login sedang tidak tersedia. Coba lagi sebentar.");
  }
  if (!user) {
    catatGagal(kunci);
    // Pesan sama untuk email tak dikenal dan sandi salah.
    return galat(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah.");
  }
  percobaan.delete(kunci);

  const exp = Math.floor(Date.now() / 1000) + TTL_DETIK;
  const token = await buatToken({ sub: user.email, nama: user.nama, role: user.role, exp }, kunciRahasia);
  const res = NextResponse.json({ tujuan: RUMAH[user.role] }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(COOKIE, token, { ...opsiCookie, maxAge: TTL_DETIK });
  return res;
}
