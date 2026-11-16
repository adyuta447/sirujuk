import { after } from "next/server";
import type { Sesi } from "./token";

/** Pasangan resource dan aksi yang dikenal log aktivitas backend untuk rute yang dicatatnya. */
export interface Jejak {
  resource: "referral" | "clarification" | "audit" | "simulation" | "config";
  action: "create" | "read" | "list" | "update" | "delete" | "rescore" | "simulate";
}

// Bentuk yang diterima backend (POST /api/v1/activity/refusal). Di luar ini backend menjawab 400, jadi tidak dikirim.
const ID_LAPOR = /^[A-Za-z0-9._:-]{1,64}$/;
const KODE_LAPOR = /^[A-Z_]{1,40}$/;
const BATAS_MS = 1500;

/**
 * Melapor ke backend bahwa proxy baru saja menolak sebuah permintaan, supaya penolakan itu masuk log aktivitas
 * (proxy menolak tanpa memanggil backend, jadi backend tidak tahu). Aman dipanggil di mana saja:
 * - dijalankan lewat `after()`, jadi tidak menunda jawaban ke pengguna tetapi tetap selesai di Vercel;
 * - timeout pendek, dan kegagalan apa pun ditelan: jawaban 403/400 ke pengguna tidak pernah berubah;
 * - aktor dan peran hanya dari sesi bertanda tangan (header), tidak pernah dari body;
 * - hanya untuk status 400-499 dan kode yang sah; tanpa sesi sah tidak ada yang dilaporkan (pemanggil tak punya `sesi`).
 */
export function laporkanPenolakan(sesi: Sesi, jejak: Jejak, status: number, code: string, resourceId?: string): void {
  if (!(status >= 400 && status <= 499) || !KODE_LAPOR.test(code)) return;
  const body = { ...jejak, status, code, ...(resourceId && ID_LAPOR.test(resourceId) && { resource_id: resourceId }) };
  const kirim = () =>
    fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/activity/refusal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.API_TOKEN && { Authorization: `Bearer ${process.env.API_TOKEN}` }),
        "X-Actor": sesi.sub,
        "X-Actor-Role": sesi.role,
        "X-Session": sesi.sid,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BATAS_MS),
      cache: "no-store",
    }).then(() => undefined, () => undefined);
  try {
    after(kirim);
  } catch {
    void kirim(); // di luar lingkup permintaan `after` melempar; tetap kirim tanpa menunggu
  }
}
