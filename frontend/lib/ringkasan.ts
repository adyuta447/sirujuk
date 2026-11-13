import type { RiskLevel, RujukanCase } from "./sirujuk-data";

const TUJUAN_TERATAS = 4;

export type Ringkasan = {
  total: number;
  perluDicek: number;
  sudahDicek: number;
  menunggu: number;
  tujuanTerbanyak: { nama: string; jumlah: number; porsi: number }[];
  sebaran: Record<RiskLevel, number>; // persen
};

export const persen = (bagian: number, total: number) =>
  total === 0 ? 0 : Math.round((1000 * bagian) / total) / 10;

export function ringkas(daftar: RujukanCase[]): Ringkasan {
  const total = daftar.length;
  const jumlah = (tingkat: RiskLevel) =>
    daftar.filter((c) => c.risk === tingkat).length;
  const sudahDicek = daftar.filter((c) => c.status === "selesai").length;

  const perTujuan = new Map<string, number>();
  for (const c of daftar)
    perTujuan.set(c.fasalTujuan, (perTujuan.get(c.fasalTujuan) ?? 0) + 1);
  const urut = [...perTujuan]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TUJUAN_TERATAS);
  const terbesar = urut[0]?.[1] ?? 1;

  return {
    total,
    perluDicek: jumlah("tinggi"),
    sudahDicek,
    menunggu: total - sudahDicek,
    tujuanTerbanyak: urut.map(([nama, n]) => ({
      nama,
      jumlah: n,
      porsi: Math.round((100 * n) / terbesar),
    })),
    sebaran: {
      rendah: persen(jumlah("rendah"), total),
      sedang: persen(jumlah("sedang"), total),
      tinggi: persen(jumlah("tinggi"), total),
    },
  };
}
