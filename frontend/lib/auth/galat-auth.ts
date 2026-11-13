import { NextResponse } from "next/server";

export function galatAuth(status: number, code: string, message: string, extra?: Record<string, string>) {
  return NextResponse.json({ code, message }, { status, headers: { "Cache-Control": "no-store", ...extra } });
}
