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
