"use client";

import { useState } from "react";
import { DEFAULT_REGION } from "../lib/constants";
import { opsiWilayah } from "../lib/formatters";
import { useFilterStore } from "../store/useFilterStore";
import { useAppNavigation } from "./useAppNavigation";
import { useReferrals } from "./useReferral";
import { useSession } from "./useSession";

export function useSirujukPage(initialId?: string) {
  const nav = useAppNavigation();
  const { data: sesi } = useSession();
  const filter = useFilterStore();
  const [menuOpen, setMenuOpen] = useState(false);
  // Konteks halaman dibaca dari URL (initialId), jadi tombol back dan refresh tetap jalan.
  // Detail/audit hanya mencari di daftar dari API. Tanpa daftar (memuat atau gagal) tidak ada pasien cadangan: yang tampil "memuat" atau "tidak ditemukan".
  const { data: daftarRujukan, isPending: memuatRujukan } = useReferrals();
  const kasus = (daftarRujukan ?? []).find((c) => c.id === initialId) ?? null;

  return {
    nav,
    sesi,
    filter,
    kasus,
    memuatRujukan,
    menuOpen,
    setMenuOpen,
    pilihanWilayah: opsiWilayah(daftarRujukan ?? [], filter.wilayah, DEFAULT_REGION),
  };
}
