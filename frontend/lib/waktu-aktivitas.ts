/** "Hari ini, 14.03" untuk hari ini, selain itu "15 Nov, 14.03". */
export function waktuAktivitas(iso: string, sekarang = new Date()): string {
  const d = new Date(iso);
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === sekarang.toDateString()) return `Hari ini, ${jam}`;
  return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}, ${jam}`;
}
