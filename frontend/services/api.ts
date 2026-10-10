// Browser calls the Next.js proxy (same origin). The backend URL and token stay server-side.
// Fixed same-origin path: no env override, so the browser can never be pointed at another host.
const baseURL = "/api/v1";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseURL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    throw new Error("Permintaan data gagal. Silakan coba lagi.");
  }
  return response.json() as Promise<T>;
}
