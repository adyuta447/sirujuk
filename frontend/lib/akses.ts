// Akses per peran. Dipakai proxy (server), route handler, dan UI (hanya untuk menyembunyikan menu).
// Penegakan sebenarnya selalu di server; menu yang disembunyikan bukan kontrol keamanan.
export type Peran = "verifikator" | "tkmkb" | "dinkes" | "dokter";

export const PERAN: Peran[] = ["verifikator", "tkmkb", "dinkes", "dokter"];

export const RUMAH: Record<Peran, string> = {
  verifikator: "/dashboard",
  tkmkb: "/audit",
  dinkes: "/dinkes",
  dokter: "/klarifikasi",
};

export const NAMA_PERAN: Record<Peran, string> = {
  verifikator: "Verifikator BPJS",
  tkmkb: "Anggota TKMKB",
  dinkes: "Dinas Kesehatan",
  dokter: "Dokter FKTP",
};

const PETUGAS: Peran[] = ["verifikator", "tkmkb"];

const AKSES: [string, Peran[]][] = [
  ["/dashboard", PETUGAS],
  ["/masuk", PETUGAS],
  ["/queue", PETUGAS],
  ["/referral", PETUGAS],
  ["/analytics", PETUGAS],
  ["/skor", PETUGAS],
  ["/audit", PETUGAS],
  ["/dokter", PETUGAS],
  ["/dinkes", ["dinkes", ...PETUGAS]],
  ["/klarifikasi", ["dokter", ...PETUGAS]],
  // Batas risiko dan direktori RS boleh dilihat Dinkes; mengubah batas hanya TKMKB (ditegakkan backend dan proxy).
  ["/pengaturan-risiko", ["dinkes", ...PETUGAS]],
  ["/rumah-sakit", ["dinkes", ...PETUGAS]],
  ["/simulasi", PETUGAS],
  // Daftar aksi pengguna sendiri di sesi ini: semua peran.
  ["/aktivitas", PERAN],
];

export const HALAMAN_PUBLIK = ["/", "/login", "/daftar"];

/** Halaman yang memang ada. Selain ini dibiarkan sampai Next sendiri, supaya URL asal-asalan mendapat 404, bukan dialihkan. */
export const halamanDikenal = (path: string) =>
  HALAMAN_PUBLIK.includes(path) || AKSES.some(([p]) => path === p || path.startsWith(`${p}/`));

export function bolehAkses(peran: Peran, path: string): boolean {
  const aturan = AKSES.find(([p]) => path === p || path.startsWith(`${p}/`));
  return !!aturan && aturan[1].includes(peran);
}

export const bolehSkor = (peran: Peran) => PETUGAS.includes(peran);

// Klaim yang ditahan tetap urusan TKMKB walau skor sudah turun (mis. sesudah diedit); backend menegakkannya sama.
export const hanyaTkmkb = (risk: string, peran?: Peran, claimStatus?: string) =>
  peran === "verifikator" && (risk === "tinggi" || claimStatus === "ditahan");
