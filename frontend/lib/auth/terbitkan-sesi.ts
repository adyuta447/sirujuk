import { NextResponse } from "next/server";
import { RUMAH } from "../akses";
import type { Peran } from "../akses";
import { COOKIE, opsiCookie } from "./session";
import { buatToken } from "./token";

interface Pengguna {
  sub: string;
  nama: string;
  role: Peran;
}

/** Respons login sukses: halaman tujuan peran + cookie sesi bertanda tangan. */
export async function terbitkanSesi(pengguna: Pengguna, ttlDetik: number, kunci: string) {
  const exp = Math.floor(Date.now() / 1000) + ttlDetik;
  const token = await buatToken({ ...pengguna, exp }, kunci);
  const res = NextResponse.json({ tujuan: RUMAH[pengguna.role] }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(COOKIE, token, { ...opsiCookie, maxAge: ttlDetik });
  return res;
}
