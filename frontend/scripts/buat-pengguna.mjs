// Membuat satu entri akun (email, nama, peran, hash) untuk `useradd -import` atau AUTH_USERS di backend lokal. Pemakaian: node scripts/buat-pengguna.mjs email "Nama" peran
// Kata sandi dibaca dari variabel SANDI, atau ditanyakan di terminal (jangan taruh di argumen).
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";

const [email, nama, role] = process.argv.slice(2);
if (!email || !nama || !["verifikator", "tkmkb", "dinkes", "dokter"].includes(role)) {
  console.error('Pemakaian: node scripts/buat-pengguna.mjs email "Nama" verifikator|tkmkb|dinkes|dokter');
  process.exit(1);
}
let sandi = process.env.SANDI;
if (!sandi) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  sandi = await rl.question("Kata sandi (min. 12 karakter): ");
  rl.close();
}
if (sandi.length < 12) {
  console.error("Kata sandi minimal 12 karakter.");
  process.exit(1);
}
const garam = randomBytes(16);
const h = await promisify(scrypt)(sandi, garam, 64);
console.log(JSON.stringify({ email, nama, role, hash: `scrypt:${garam.toString("hex")}:${h.toString("hex")}` }));
