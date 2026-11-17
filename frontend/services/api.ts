import { pesan403, pesan409, pesan422 } from "../lib/pesan-galat";

// Browser calls the Next.js proxy (same origin). The backend URL and token stay server-side.
// Fixed same-origin path: no env override, so the browser can never be pointed at another host.
const baseURL = "/api/v1";

/** Error dari server: `message` adalah teks yang aman ditampilkan (kode dan pesan dari backend/proksi). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseURL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    // Pesan server dipakai hanya untuk galat 4xx; galat server (5xx) tetap generik supaya tidak membocorkan detail.
    const isi = response.status < 500 ? await response.json().catch(() => null) : null;
    const code = typeof isi?.code === "string" ? isi.code : undefined;
    const dariServer = typeof isi?.message === "string" && isi.message.length <= 300 ? isi.message : "Permintaan data gagal. Silakan coba lagi.";
    const pesan = (response.status === 409 && pesan409(code)) || (response.status === 403 && pesan403(code)) || (response.status === 422 && pesan422(code)) || dariServer;
    throw new ApiError(pesan, response.status, code);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}
