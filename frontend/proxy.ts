import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { HALAMAN_PUBLIK, RUMAH, bolehAkses, halamanDikenal } from "./lib/akses";
import { COOKIE, sesiDariCookie } from "./lib/auth/session";
import { sesiMasihAktif } from "./lib/auth/sesi-aktif";

// Strict CSP: a fresh nonce per request, no 'unsafe-inline' for scripts or style elements.
// Inline style *attributes* (React style={{}}) are allowed separately; they cannot run code.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const dariCookie = await sesiDariCookie(request.cookies.get(COOKIE)?.value);
  // Cookie bertanda tangan sah belum cukup: sesi yang sudah logout (dicabut di backend) harus ditolak juga di gerbang halaman.
  const sesi = dariCookie && path !== "/" && (await sesiMasihAktif(dariCookie)) ? dariCookie : null;
  const ke = (tujuan: string) => NextResponse.redirect(new URL(tujuan, request.url));
  // Gerbang autentikasi dan peran: semua halaman selain yang publik butuh sesi sah (fail closed).
  if (path === "/login" || path === "/daftar") {
    if (sesi) return ke(RUMAH[sesi.role]);
  } else if (halamanDikenal(path) && !HALAMAN_PUBLIK.includes(path)) {
    if (!sesi) return ke("/login");
    if (!bolehAkses(sesi.role, path)) return ke(RUMAH[sesi.role]);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Perkuat skema https di produksi. Di dev (http://localhost) tidak dipakai supaya tidak merusak server lokal.
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Static image files (including root ones like the logo) must skip the login gate: logged-out visitors on the
      // landing and login pages request them, and /_next/image fetches them without a session cookie.
      // No `missing` for prefetch headers: a client sets those, so skipping on them let anyone bypass the login gate.
      source: "/((?!api|_next/static|_next/image|images|illustrations|.*\\.(?:png|jpe?g|gif|svg|webp|ico)$).*)",
    },
  ],
};
