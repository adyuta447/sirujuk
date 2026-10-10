import { bacaToken } from "./token";
import type { Sesi } from "./token";

const prod = process.env.NODE_ENV === "production";
// __Host- mengunci cookie ke host ini, path "/", wajib Secure. Di dev (http) tidak bisa dipakai.
export const COOKIE = prod ? "__Host-sirujuk_session" : "sirujuk_session";
export const TTL_DETIK = 8 * 60 * 60;

/** Rahasia penanda tangan. null = auth belum dikonfigurasi, semua akses ditolak (fail closed). */
export function rahasia(): string | null {
  const s = process.env.AUTH_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function sesiDariCookie(nilai?: string): Promise<Sesi | null> {
  const kunci = rahasia();
  return kunci && nilai ? bacaToken(nilai, kunci) : null;
}

/**
 * Login tanpa kata sandi hanya untuk demo. Dua syarat: DEMO_MODE=true DAN bukan deployment produksi (Vercel Production
 * atau APP_ENV=production). Salah set di production tidak membuka pintu; backend menolak DEMO_ACCOUNTS dengan cara sama.
 */
export function demoAktif(): boolean {
  if (process.env.DEMO_MODE !== "true") return false;
  return process.env.VERCEL_ENV !== "production" && process.env.APP_ENV !== "production";
}

export const opsiCookie = {
  httpOnly: true,
  secure: prod,
  sameSite: "lax" as const,
  path: "/",
};
