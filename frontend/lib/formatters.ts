export function formatVerifierDate(date: Date): string {
  return date.toLocaleDateString("id-ID");
}

// Pasien ditampilkan sebagai pseudonim, bukan nama asli (aturan privasi UI).
export function maskPasien(noRujukan: string): string {
  return `Pasien #${noRujukan.slice(-4)}`;
}

export function cocokCari(
  c: { noRujukan: string; dokter: string; diagnosa: string; fasalOrigin: string; fasalTujuan: string },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  return !q || [c.noRujukan, c.dokter, c.diagnosa, c.fasalOrigin, c.fasalTujuan].some((v) => v.toLowerCase().includes(q));
}

export function periodeSekarang(date = new Date()): string {
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** Nama pasien persis seperti yang dikirim backend (sudah disamarkan sesuai peran); samaran bila tidak dikirim. */
export function tampilPasien(c: { pasien?: string; noRujukan: string }): string {
  return c.pasien?.trim() || maskPasien(c.noRujukan);
}

/** Dua huruf awal nama untuk avatar. */
export function inisial(nama: string): string {
  return nama.split(" ").map((k) => k[0]).slice(0, 2).join("").toUpperCase();
}

/** Persentase gaya Indonesia dengan maksimal satu desimal; "0%" bila pembagi nol. */
export function formatPersenId(bagian: number, total: number): string {
  if (total === 0) return "0%";
  return `${((bagian / total) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** Persen dari backend; strip bila datanya tidak ada. */
export function persenAtauStrip(v: number | null): string {
  return v === null ? "-" : `${v}%`;
}

/** Lebar meter 0-100 dari persen apa adanya, tanpa ambang warna: perbandingan netral. */
export function lebarMeter(v: number): string {
  return `${Math.min(100, Math.max(0, v))}%`;
}
