import { RISK } from "../lib/sirujuk-data";
import type { HasilCek, VonisKesesuaian } from "../types/hospital";

// Teks dan warna; warna tidak pernah satu-satunya penanda.
export const VONIS: Record<VonisKesesuaian, { label: string; bg: string }> = {
  sesuai: { label: "Sesuai", bg: "#17803F" },
  sebagian: { label: "Sebagian sesuai", bg: "#9A5A08" },
  tidak_sesuai: { label: "Tidak sesuai", bg: "#C42222" },
  belum_terverifikasi: { label: "Belum terverifikasi", bg: "#64748B" },
};

export const HASIL_CEK: Record<HasilCek, string> = {
  ok: "Sesuai",
  partial: "Sebagian",
  fail: "Tidak sesuai",
  unknown: "Belum diketahui",
  info: "Info",
};

// Sama dengan warna nilai di Rincian Skor.
export const WARNA_CEK: Record<HasilCek, string> = {
  ok: RISK.rendah.text,
  partial: RISK.sedang.text,
  fail: RISK.tinggi.text,
  unknown: "#64748B",
  info: "#0E1B2A",
};
