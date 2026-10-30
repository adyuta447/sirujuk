import { Check, Inbox, ListChecks, TriangleAlert } from "lucide-react";
import type { StatCardData } from "../types/dashboard";
import { formatPersenId } from "./formatters";
import type { RingkasanBeranda } from "./ringkasan-beranda";

export function bangunKartuStat(r: RingkasanBeranda, loading: boolean): StatCardData[] {
  const angka = (n: number) => (loading ? "…" : n.toLocaleString("id-ID"));
  return [
    { to: "masuk", art: "stat-masuk", label: "Rujukan masuk", val: angka(r.total), sub: "di backend", Icon: Inbox },
    { to: "queue", art: "stat-cek", label: "Perlu dicek", val: angka(r.perluDicek), sub: `${formatPersenId(r.perluDicek, r.total)} dari total`, Icon: TriangleAlert },
    { to: "queue", art: "stat-antre", label: "Masih mengantre", val: angka(r.menunggu), sub: "belum ditindaklanjuti", Icon: ListChecks },
    { to: "analytics", art: "stat-selesai", label: "Selesai dicek", val: angka(r.selesai), sub: `${formatPersenId(r.selesai, r.perluDicek)} dari yang ditandai`, Icon: Check },
  ];
}
