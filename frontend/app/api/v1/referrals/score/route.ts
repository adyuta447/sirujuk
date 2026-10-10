// Server-side proxy: the browser never sees BACKEND_URL or API_TOKEN (they are not NEXT_PUBLIC_*).
import { cookies } from "next/headers";
import { asalSama } from "../../../../../lib/auth/origin";
import { bolehSkor } from "../../../../../lib/akses";
import { COOKIE, sesiDariCookie } from "../../../../../lib/auth/session";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const MAX_BODY = 32 * 1024;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/;

export async function POST(request: Request) {
  // Hanya petugas yang sudah masuk. Tanpa ini, token backend akan dipakai untuk siapa saja.
  const sesi = await sesiDariCookie((await cookies()).get(COOKIE)?.value);
  if (!sesi) return Response.json({ code: "UNAUTHORIZED", message: "Silakan masuk dulu" }, { status: 401 });
  if (!bolehSkor(sesi.role)) return Response.json({ code: "FORBIDDEN", message: "Peran ini tidak boleh menghitung skor" }, { status: 403 });
  // Same-origin only; a cross-site form/fetch cannot spend the server token.
  if (!asalSama(request)) {
    return Response.json({ code: "FORBIDDEN", message: "Origin tidak diizinkan" }, { status: 403 });
  }
  const key = request.headers.get("idempotency-key") ?? "";
  if (!SAFE_ID.test(key)) {
    return Response.json({ code: "INVALID_REQUEST", message: "Permintaan tidak valid" }, { status: 400 });
  }
  const body = await request.text();
  if (body.length > MAX_BODY) {
    return Response.json({ code: "PAYLOAD_TOO_LARGE", message: "Permintaan terlalu besar" }, { status: 413 });
  }
  const cid = request.headers.get("x-correlation-id") ?? "";
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/referrals/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        ...(SAFE_ID.test(cid) && { "X-Correlation-ID": cid }),
        ...(process.env.API_TOKEN && { Authorization: `Bearer ${process.env.API_TOKEN}` }),
      },
      body,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    // No upstream detail leaks to the client; the referral itself is never blocked by this.
    return Response.json({ code: "UPSTREAM_UNAVAILABLE", message: "Layanan skoring tidak tersedia" }, { status: 502 });
  }
}
