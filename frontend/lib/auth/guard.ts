import { cookies } from "next/headers";
import { bolehSkor } from "../akses";
import type { Peran } from "../akses";
import { laporkanPenolakan } from "./laporan-penolakan";
import type { Jejak } from "./laporan-penolakan";
import { asalSama } from "./origin";
import { COOKIE, sesiDariCookie } from "./session";
import type { Sesi } from "./token";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const json = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status, headers: { "Cache-Control": "no-store" } });

export const ID_AMAN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/;

type Hasil = { sesi: Sesi } | { galat: Response };

/** Menolak dengan `json` dan melaporkannya ke log aktivitas backend (satu kali). Hanya dipakai setelah sesi sah. */
export function tolak(sesi: Sesi, jejak: Jejak | undefined, status: number, code: string, message: string, resourceId?: string): Response {
  if (jejak) laporkanPenolakan(sesi, jejak, status, code, resourceId);
  return json(status, code, message);
}

/**
 * Pengguna yang sudah masuk dengan peran yang diizinkan. Untuk request yang mengubah data, Origin juga harus sama.
 * Dengan `jejak`, penolakan 403 dilaporkan ke log aktivitas; tanpa sesi sah (401) tidak ada yang dilaporkan.
 */
export async function wajibPeran(request: Request, izinkan: (peran: Peran) => boolean, ubahData: boolean, jejak?: Jejak, resourceId?: string): Promise<Hasil> {
  const sesi = await sesiDariCookie((await cookies()).get(COOKIE)?.value);
  if (!sesi) return { galat: json(401, "UNAUTHORIZED", "Silakan masuk dulu") };
  if (!izinkan(sesi.role)) return { galat: tolak(sesi, jejak, 403, "FORBIDDEN", "Peran ini tidak boleh melakukan aksi ini", resourceId) };
  if (ubahData && !asalSama(request)) return { galat: tolak(sesi, jejak, 403, "FORBIDDEN", "Origin tidak diizinkan", resourceId) };
  return { sesi };
}

/** Petugas (verifikator/TKMKB) yang sudah masuk. */
export const wajibPetugas = (request: Request, ubahData: boolean, jejak?: Jejak, resourceId?: string) =>
  wajibPeran(request, bolehSkor, ubahData, jejak, resourceId);

/** Isi body sebagai teks, atau null bila melebihi batas. Backend tetap memvalidasi isinya. */
export async function bacaBody(request: Request, maksBytes: number): Promise<string | null> {
  // Tolak lebih awal lewat Content-Length supaya body besar tidak dimuat ke memori dulu; backend tetap membatasi.
  if (Number(request.headers.get("content-length") ?? 0) > maksBytes) return null;
  const mentah = await request.text();
  return mentah.length > maksBytes ? null : mentah;
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
    // 204/205/304 tidak boleh punya body: Response("", {status: 204}) melempar error dan tampil sebagai 502.
    const tanpaBody = [204, 205, 304].includes(upstream.status);
    return new Response(tanpaBody ? null : await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return json(502, "UPSTREAM_UNAVAILABLE", "Layanan backend tidak tersedia");
  }
}

/** Seperti keBackend, tapi menyertakan siapa yang bertindak (dari sesi) agar backend mencatatnya di log akses/audit. */
export const keBackendSebagai = (sesi: Sesi, path: string, init: RequestInit = {}) =>
  keBackend(path, { ...init, headers: { "X-Actor": sesi.sub, "X-Actor-Role": sesi.role, "X-Session": sesi.sid, ...init.headers } });

/**
 * Rujukan merah hanya diproses TKMKB; verifikator hanya kuning/hijau. Dicek di server dari skor tersimpan, bukan dari
 * body. Mengembalikan Response galat, atau null bila boleh. Gagal membaca rujukan = ditolak (fail closed).
 */
export async function wajibTingkat(sesi: Sesi, id: string, jejak?: Jejak): Promise<Response | null> {
  if (sesi.role === "tkmkb") return null;
  const res = await keBackendSebagai(sesi, `/api/v1/referrals/${encodeURIComponent(id)}`);
  if (!res.ok) return res;
  const d = await res.json().catch(() => null);
  if (!d?.decision) return json(502, "UPSTREAM_INVALID", "Data rujukan tidak dapat diverifikasi");
  if (d.decision.decision === "red") return tolak(sesi, jejak, 403, "FORBIDDEN_LEVEL", "Rujukan berisiko tinggi hanya boleh diproses anggota TKMKB", id);
  return null;
}

export { json };
