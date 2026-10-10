import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { PERAN } from "../akses";
import type { Peran } from "../akses";

// Hanya server. Pengguna datang dari AUTH_USERS (JSON), kata sandi disimpan sebagai hash scrypt.
// shortcut: daftar pengguna dari env, tanpa database; ganti dengan layanan identitas backend sebelum pilot.
const hitung = promisify(scrypt) as (sandi: string, garam: Buffer, panjang: number) => Promise<Buffer>;

type Pengguna = { email: string; nama: string; role: Peran; hash: string };

function muat(): Pengguna[] {
  try {
    const arr = JSON.parse(process.env.AUTH_USERS ?? "[]");
    return Array.isArray(arr)
      ? arr.filter(
          (u): u is Pengguna =>
            typeof u?.email === "string" && typeof u?.nama === "string" && typeof u?.hash === "string" && PERAN.includes(u?.role),
        )
      : [];
  } catch {
    return [];
  }
}

export async function buatHash(sandi: string): Promise<string> {
  const garam = randomBytes(16);
  const h = await hitung(sandi, garam, 64);
  return `scrypt:${garam.toString("hex")}:${h.toString("hex")}`;
}

async function cocok(sandi: string, hash: string): Promise<boolean> {
  const [alg, garam, nilai] = hash.split(":");
  if (alg !== "scrypt" || !garam || !nilai) return false;
  const harapan = Buffer.from(nilai, "hex");
  const didapat = await hitung(sandi, Buffer.from(garam, "hex"), harapan.length);
  return didapat.length === harapan.length && timingSafeEqual(didapat, harapan);
}

const HASH_PALSU = `scrypt:${"00".repeat(16)}:${"00".repeat(64)}`;

/** Selalu menghitung hash, termasuk saat email tidak ada, supaya waktu respons tidak membocorkan akun. */
export async function verifikasi(email: string, sandi: string): Promise<Pengguna | null> {
  const user = muat().find((u) => u.email.toLowerCase() === email.toLowerCase());
  const ok = await cocok(sandi, user?.hash ?? HASH_PALSU);
  return user && ok ? user : null;
}
