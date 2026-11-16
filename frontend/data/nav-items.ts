import { BarChart3, Building2, ClipboardCheck, FilePlus2, FlaskConical, Hospital, Inbox, LayoutDashboard, ListChecks, MessageSquareText, SlidersHorizontal, Stethoscope } from "lucide-react";
import type { NavItem } from "../types/nav";

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Beranda", Icon: LayoutDashboard },
  { id: "masuk", label: "Rujukan Masuk", Icon: Inbox },
  { id: "queue", label: "Antrean Cek", Icon: ListChecks },
  { id: "audit", label: "Audit", Icon: ClipboardCheck },
  { id: "dokter", label: "Profil Dokter", Icon: Stethoscope },
  { id: "klarifikasi", label: "Klarifikasi", Icon: MessageSquareText },
  { id: "dinkes", label: "Pantauan Wilayah", Icon: Building2 },
  { id: "skor", label: "Skor Rujukan", Icon: FilePlus2 },
  { id: "analytics", label: "Analitik", Icon: BarChart3 },
  { id: "rumahsakit", label: "Rumah Sakit", Icon: Hospital },
  { id: "simulasi", label: "Simulasi Skor", Icon: FlaskConical },
  { id: "pengaturan", label: "Pengaturan Risiko", Icon: SlidersHorizontal },
];
