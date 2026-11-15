/** @jest-environment node */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Nama pasien disamarkan backend sesuai peran (verifikator: inisial; dokter: kosong). Frontend hanya boleh
// menampilkannya lewat tampilPasien, supaya tidak ada halaman yang menampilkan nilai mentah atau kosong.
const mentah = /\.pasien\b/;
const DIIZINKAN = [join("lib", "formatters.ts")];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) && !/\.test\./.test(p) ? [p] : [];
  });
}

it("shows the patient name only through tampilPasien", () => {
  const root = join(__dirname, "../..");
  const hits = ["app", "components", "hooks", "features", "lib"]
    .flatMap((d) => files(join(root, d)))
    .filter((f) => !DIIZINKAN.some((ok) => f.endsWith(ok)))
    .filter((f) => mentah.test(readFileSync(f, "utf8")))
    .map((f) => f.replace(`${root}/`, ""));
  expect(hits).toEqual([]);
});
