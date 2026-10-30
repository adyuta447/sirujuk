import type { LucideIcon } from "lucide-react";
import type { IllustrationName } from "../components/atoms/Illustration";
import type { RiskLevel } from "../lib/sirujuk-data";

export interface LandingLink {
  href: string;
  label: string;
}

export interface Feature {
  judul: string;
  isi: string;
  art: IllustrationName;
}

export interface Audience {
  judul: string;
  isi: string;
  art: IllustrationName;
}

export interface Outcome {
  label: string;
  isi: string;
  tone: RiskLevel;
  Icon: LucideIcon;
}

export interface Stat {
  v: number;
  suffix: string;
  l: string;
  Icon: LucideIcon;
}
