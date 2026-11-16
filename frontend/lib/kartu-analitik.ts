import { Check, Inbox, ListChecks, TriangleAlert } from "lucide-react";
import type { KartuStat } from "../types/dashboard";
import { formatPersenId } from "./formatters";
import type { Ringkasan } from "./ringkasan";

/** Empat kartu ringkasan Analitik, dengan ikon dan ilustrasi yang sama seperti kartu padanannya di Beranda. */
export function bangunKartuAnalitik(r: Ringkasan): KartuStat[] {
  const angka = (n: number) => n.toLocaleString("id-ID");
  return [
    { art: "stat-masuk", label: "Total rujukan", val: angka(r.total), sub: "yang sudah dinilai", Icon: Inbox },
    { art: "stat-cek", label: "Perlu dicek", val: angka(r.perluDicek), sub: `${formatPersenId(r.perluDicek, r.total)} dari total`, Icon: TriangleAlert },
    { art: "stat-selesai", label: "Sudah dicek", val: angka(r.sudahDicek), sub: "sudah ada hasil audit", Icon: Check },
    { art: "stat-antre", label: "Menunggu", val: angka(r.menunggu), sub: "belum ditinjau", Icon: ListChecks },
  ];
}
