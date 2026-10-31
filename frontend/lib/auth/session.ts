import { bacaToken } from "./token";
import type { Sesi } from "./token";

// Cookie Secure + prefix __Host- wajib di produksi (https). Satu-satunya kelonggaran: build produksi lokal di
// http://localhost (compose), yang butuh ALLOW_INSECURE_COOKIE=true agar browser mau menyimpan cookie. Kelonggaran itu
// diabaikan di Vercel Production dan bila APP_ENV=production, jadi salah set di sana tidak melemahkan cookie.
export function cookieAman(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return false;
  const longgarLokal = env.ALLOW_INSECURE_COOKIE === "true" && env.VERCEL_ENV !== "production" && env.APP_ENV !== "production";
  return !longgarLokal;
}
const prod = cookieAman();
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
 * Login tanpa kata sandi hanya untuk demo: DEMO_MODE=true dan bukan APP_ENV=production. Vercel Production boleh, karena
 * sirujuk.vercel.app sengaja dipakai untuk demo hackathon dengan backend demo (data contoh). Matikan DEMO_MODE di sana
 * sebelum dipakai dengan data asli.
 */
export function demoAktif(): boolean {
  return process.env.DEMO_MODE === "true" && process.env.APP_ENV !== "production";
}

export const opsiCookie = {
  httpOnly: true,
  secure: prod,
  sameSite: "lax" as const,
  path: "/",
};
