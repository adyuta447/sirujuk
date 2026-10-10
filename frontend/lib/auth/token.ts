import { PERAN } from "../akses";
import type { Peran } from "../akses";

// Token sesi: base64url(payload).base64url(HMAC-SHA256). Web Crypto, jadi jalan di proxy maupun route handler.
export type Sesi = { sub: string; nama: string; role: Peran; exp: number };

const enc = new TextEncoder();
const kunci = (rahasia: string) =>
  crypto.subtle.importKey("raw", enc.encode(rahasia), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
const b64u = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString("base64url");

export async function buatToken(sesi: Sesi, rahasia: string): Promise<string> {
  const isi = b64u(enc.encode(JSON.stringify(sesi)));
  const tanda = await crypto.subtle.sign("HMAC", await kunci(rahasia), enc.encode(isi));
  return `${isi}.${b64u(tanda)}`;
}

export async function bacaToken(token: string, rahasia: string): Promise<Sesi | null> {
  const bagian = token.split(".");
  if (bagian.length !== 2 || token.length > 2048) return null;
  const [isi, tanda] = bagian;
  try {
    const sah = await crypto.subtle.verify("HMAC", await kunci(rahasia), new Uint8Array(Buffer.from(tanda, "base64url")), enc.encode(isi));
    if (!sah) return null;
    const s = JSON.parse(Buffer.from(isi, "base64url").toString("utf8")) as Partial<Sesi>;
    if (typeof s.sub !== "string" || typeof s.nama !== "string" || typeof s.exp !== "number") return null;
    if (!PERAN.includes(s.role as Peran) || s.exp * 1000 < Date.now()) return null;
    return s as Sesi;
  } catch {
    return null;
  }
}
