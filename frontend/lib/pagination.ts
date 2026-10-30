/** Nomor halaman ringkas: semua bila <= 7, else 1 … jendela … N. */
export function halamanRingkas(
  halaman: number,
  total: number,
): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const jendela = new Set(
    [1, 2, halaman - 1, halaman, halaman + 1, total - 1, total].filter(
      (n) => n >= 1 && n <= total,
    ),
  );
  const urut = [...jendela].sort((a, b) => a - b);
  const keluar: (number | "…")[] = [];
  for (let i = 0; i < urut.length; i++) {
    keluar.push(urut[i]);
    if (i < urut.length - 1 && urut[i + 1] - urut[i] > 1) keluar.push("…");
  }
  return keluar;
}
