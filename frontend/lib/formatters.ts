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
