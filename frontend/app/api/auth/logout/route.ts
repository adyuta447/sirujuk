import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { keBackendSebagai } from "../../../../lib/auth/guard";
import { asalSama } from "../../../../lib/auth/origin";
import { COOKIE, opsiCookie, sesiDariCookie } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  if (!asalSama(request)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "Permintaan ditolak." }, { status: 403 });
  }
  // Cabut sesi di backend, supaya cookie yang telanjur dicuri tidak bisa dipakai lagi. Gagal dicabut tetap logout.
  const sesi = await sesiDariCookie((await cookies()).get(COOKIE)?.value);
  if (sesi) await keBackendSebagai(sesi, "/api/v1/auth/logout", { method: "POST" });
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(COOKIE, "", { ...opsiCookie, maxAge: 0 });
  return res;
}
