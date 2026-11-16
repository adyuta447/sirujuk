"use client";

import { useEffect, useState } from "react";
import { useAktivitasStore } from "../store/useAktivitasStore";

export type FilterAktivitas = "semua" | "berhasil" | "gagal";

/** Daftar aktivitas dengan filter dan jumlah per jenis. Membuka halaman ini menandai semuanya sudah dibaca. */
export function useAktivitas() {
  const daftar = useAktivitasStore((s) => s.daftar);
  const tandaiDibaca = useAktivitasStore((s) => s.tandaiDibaca);
  const kosongkan = useAktivitasStore((s) => s.kosongkan);
  const [filter, setFilter] = useState<FilterAktivitas>("semua");

  // Juga saat aktivitas baru masuk selagi halaman ini terbuka.
  useEffect(() => {
    tandaiDibaca();
  }, [daftar, tandaiDibaca]);

  const jumlah = {
    semua: daftar.length,
    berhasil: daftar.filter((a) => a.jenis === "berhasil").length,
    gagal: daftar.filter((a) => a.jenis === "gagal").length,
  };
  const tampak = filter === "semua" ? daftar : daftar.filter((a) => a.jenis === filter);
  return { tampak, jumlah, filter, setFilter, kosongkan };
}
