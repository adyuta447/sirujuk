import type { RujukanCase } from "./sirujuk-data";

export interface RingkasanBeranda {
  total: number;
  perluDicek: number;
  menunggu: number;
  selesai: number;
  tinggi: RujukanCase[];
}

export function ringkasBeranda(daftar: RujukanCase[]): RingkasanBeranda {
  const ditandai = daftar.filter((c) => c.risk !== "rendah");
  return {
    total: daftar.length,
    perluDicek: ditandai.length,
    menunggu: ditandai.filter((c) => c.status !== "selesai").length,
    selesai: ditandai.filter((c) => c.status === "selesai").length,
    tinggi: daftar.filter((c) => c.risk === "tinggi" && c.status !== "selesai"),
  };
}
