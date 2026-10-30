import type { LucideIcon } from "lucide-react";
import type { IllustrationName } from "../components/atoms/Illustration";
import type { View } from "../lib/sirujuk-data";

export interface Shortcut {
  to: View;
  art: IllustrationName;
  judul: string;
  isi: string;
}

export interface StatCardData {
  to: View;
  art: IllustrationName;
  label: string;
  val: string;
  sub: string;
  Icon: LucideIcon;
}
