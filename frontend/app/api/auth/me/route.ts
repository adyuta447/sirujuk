import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, sesiDariCookie } from "../../../../lib/auth/session";

// Hanya nama dan peran untuk tampilan. Tidak ada email atau token.
export async function GET() {
  const sesi = await sesiDariCookie((await cookies()).get(COOKIE)?.value);
  if (!sesi) return NextResponse.json({ code: "UNAUTHORIZED", message: "Belum masuk." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ nama: sesi.nama, role: sesi.role }, { headers: { "Cache-Control": "no-store" } });
}
