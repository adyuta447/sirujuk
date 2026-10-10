import { cookies } from "next/headers";
import { bolehSkor } from "../akses";
import { asalSama } from "./origin";
import { COOKIE, sesiDariCookie } from "./session";
import type { Sesi } from "./token";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const json = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers: { "Cache-Control": "no-store" } });

/** Petugas (verifikator/TKMKB) yang sudah masuk. Untuk request yang mengubah data, Origin juga harus sama. */
export async function wajibPetugas(request: Request, ubahData: boolean): Promise<{ sesi: Sesi } | { galat: Response }> {
  const sesi = await sesiDariCookie((await cookies()).get(COOKIE)?.value);
  if (!sesi) return { galat: json(401, "UNAUTHORIZED", "Silakan masuk dulu") };
  if (!bolehSkor(sesi.role)) return { galat: json(403, "FORBIDDEN", "Peran ini tidak boleh mengakses data rujukan") };
  if (ubahData && !asalSama(request)) return { galat: json(403, "FORBIDDEN", "Origin tidak diizinkan") };
  return { sesi };
}

/** Meneruskan ke backend dengan token layanan (hanya di server). Detail error upstream tidak dibocorkan. */
export async function keBackend(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    const upstream = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        "Content-Type": "application/json",
        // Token layanan ditulis terakhir supaya tidak bisa ditimpa oleh header pemanggil.
        ...(process.env.API_TOKEN && { Authorization: `Bearer ${process.env.API_TOKEN}` }),
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return json(502, "UPSTREAM_UNAVAILABLE", "Layanan backend tidak tersedia");
  }
}

export { json };
