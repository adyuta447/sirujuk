import { PERAN } from "../akses";
import type { Peran } from "../akses";
import { keBackend } from "./guard";

export type Pengguna = { email: string; nama: string; role: Peran };

/**
 * Hanya server. Akun dan hash kata sandi ada di database (Firestore) milik backend; yang kembali ke sini hanya profil.
 * null = email atau kata sandi salah. Melempar error bila backend/database tidak bisa dijangkau, supaya login
 * menjawab "layanan tidak tersedia" dan bukan "kata sandi salah".
 */
export async function verifikasi(email: string, sandi: string): Promise<Pengguna | null> {
  const res = await keBackend("/api/v1/auth/verify", { method: "POST", body: JSON.stringify({ email, password: sandi }) });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`auth backend ${res.status}`);
  const u = await res.json().catch(() => null);
  if (typeof u?.email !== "string" || typeof u?.nama !== "string" || !PERAN.includes(u?.role)) throw new Error("auth backend: bad response");
  return { email: u.email, nama: u.nama, role: u.role };
}
