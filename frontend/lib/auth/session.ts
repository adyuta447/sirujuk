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

export const opsiCookie = {
  httpOnly: true,
  secure: prod,
  sameSite: "lax" as const,
  path: "/",
};
