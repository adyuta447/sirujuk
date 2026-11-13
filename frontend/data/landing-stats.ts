import { Building2, ShieldCheck, UserCheck, Users } from "lucide-react";
import type { Stat } from "../types/landing";

export const STAT: Stat[] = [
  { v: 284, suffix: " juta", l: "peserta JKN yang dilayani", Icon: Users },
  { v: 23758, suffix: "", l: "fasilitas kesehatan tingkat pertama", Icon: Building2 },
  { v: 4, suffix: "", l: "indikator di balik setiap skor", Icon: ShieldCheck },
  { v: 0, suffix: "", l: "keputusan yang diambil otomatis", Icon: UserCheck },
];
