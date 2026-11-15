import type { Sesi } from "./token";

/**
 * Sesi yang cookie-nya masih sah belum tentu masih aktif: logout mencabutnya di backend, dan akun bisa dinonaktifkan.
 * GET /auth/session dijawab 204 bila sesi belum dicabut dan akun masih aktif, 401/403 bila tidak (middleware backend).
 * 404 (backend tanpa endpoint ini) juga dianggap tidak aktif, supaya salah urutan deploy langsung terlihat, bukan
 * mematikan pengecekan logout diam-diam. Backend tak terjangkau atau 5xx tidak mengeluarkan siapa pun, karena semua
 * panggilan data tetap dicek backend. Mandiri (tanpa next/headers) supaya bisa dipakai di proxy.ts.
 */
export async function sesiMasihAktif(sesi: Sesi): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/auth/session`, {
      headers: {
        ...(process.env.API_TOKEN && { Authorization: `Bearer ${process.env.API_TOKEN}` }),
        "X-Actor": sesi.sub,
        "X-Actor-Role": sesi.role,
        "X-Session": sesi.sid,
      },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return ![401, 403, 404].includes(res.status);
  } catch {
    return true;
  }
}
