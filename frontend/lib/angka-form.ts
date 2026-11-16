/** Angka dari isian teks: undefined bila kosong, NaN bila bukan angka atau di luar rentang. */
export function angkaForm(teks: string, min: number, maks: number, bulat = false): number | undefined {
  if (!teks.trim()) return undefined;
  const n = Number(teks);
  return Number.isFinite(n) && n >= min && n <= maks && (!bulat || Number.isInteger(n)) ? n : NaN;
}
