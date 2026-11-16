import { ClipboardCheck, Search, Stethoscope } from "lucide-react";
import type { KartuStat } from "../types/dashboard";
import type { Pencegahan } from "../types/prevention";

/** Tiga kartu blok pencegahan di Analitik. Semua angka dari backend. */
export function bangunKartuPencegahan(p: Pencegahan): KartuStat[] {
  const persen = p.kns_percent.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return [
    { art: "pintasan-klarifikasi", label: "Diagnosis wajib FKTP", val: p.kns_total.toLocaleString("id-ID"), sub: `${persen}% dari ${p.total} rujukan dinilai`, Icon: Stethoscope },
    { art: "hero", label: "Kandidat pencegahan", val: p.kns_flagged.toLocaleString("id-ID"), sub: "kuning atau merah", Icon: Search },
    { art: "audit", label: "Terkonfirmasi tidak valid", val: p.kns_confirmed_invalid.toLocaleString("id-ID"), sub: "sudah diaudit petugas", Icon: ClipboardCheck },
  ];
}
