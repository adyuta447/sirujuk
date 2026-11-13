import { bolehAkses } from "./akses";
import type { Peran } from "./akses";
import type { View } from "./sirujuk-data";

export const PATHS: Partial<Record<View, string>> = {
  dashboard: "/dashboard",
  masuk: "/masuk",
  queue: "/queue",
  audit: "/audit",
  analytics: "/analytics",
  dokter: "/dokter",
  klarifikasi: "/klarifikasi",
  dinkes: "/dinkes",
  skor: "/skor",
};

export function bolehMenu(peran: Peran | undefined, id: View): boolean {
  return !!peran && bolehAkses(peran, PATHS[id] ?? "/");
}
