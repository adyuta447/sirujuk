import { NextResponse } from "next/server";
import { asalSama } from "../../../../lib/auth/origin";
import { COOKIE, opsiCookie } from "../../../../lib/auth/session";

export async function POST(request: Request) {
  if (!asalSama(request)) {
    return NextResponse.json({ code: "FORBIDDEN", message: "Permintaan ditolak." }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(COOKIE, "", { ...opsiCookie, maxAge: 0 });
  return res;
}
