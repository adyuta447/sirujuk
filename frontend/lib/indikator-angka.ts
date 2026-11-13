export function angka(n: number, digit = 0): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: digit });
}
