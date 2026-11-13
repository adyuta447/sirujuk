import { ClipboardCheck, Inbox, LayoutDashboard, ListChecks } from "lucide-react";
import type { NavItem } from "../types/nav";

// Empat halaman utama di navigasi bawah HP.
export const TAB: NavItem[] = [
  { id: "dashboard", label: "Beranda", Icon: LayoutDashboard },
  { id: "masuk", label: "Masuk", Icon: Inbox },
  { id: "queue", label: "Antrean", Icon: ListChecks },
  { id: "audit", label: "Audit", Icon: ClipboardCheck },
];
