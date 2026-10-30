"use client";

import { useQuery } from "@tanstack/react-query";
import { getStats } from "../services/stats.service";
import { namaDokter } from "../lib/sirujuk-data";
import type { Stats } from "../types/referral";

const useStatsQuery = <T,>(select: (s: Stats) => T, enabled = true) =>
  useQuery({ queryKey: ["stats"], queryFn: getStats, staleTime: 60 * 1000, select, enabled });

/** Nama wilayah yang benar-benar ada di data, untuk pilihan filter. Hanya peran yang boleh membaca statistik. */

/** Asal data statistik bila bukan rujukan berjalan: sumber sampel (mis. "bpjs-sampel-2025"), "sintetis", atau null. */
export const useStatsSumber = () => useStatsQuery((s) => s.source ?? (s.synthetic ? "sintetis" : null));

/** Agregat per wilayah (tanpa data pasien), dihitung backend dari skor ML. */
export const useWilayahStats = () =>
  useStatsQuery((s) =>
    s.wilayah.map((w) => ({
      wilayah: w.wilayah,
      faskes: w.faskes,
      rujukan: w.rujukan,
      persenTinggi: w.persen_tinggi,
      medianNS: w.median_ns,
      hhiRata: w.hhi_rata,
    })),
  );

/** Profil risiko per dokter. Nama tampilan = ID dokter sampai ada direktori dokter. */
export const useDokterStats = () =>
  useStatsQuery((s) =>
    s.dokter.map((d) => ({
      nama: namaDokter(d.doctor_id),
      fktp: d.faskes,
      totalRujukan: d.total_rujukan,
      risikoTinggi: d.risiko_tinggi,
      persentase: d.persentase,
      narasi: d.narasi || "Belum ada alasan dominan dari model.",
      darurat: d.darurat ?? 0,
      persenDarurat: d.persen_darurat ?? 0,
    })),
  );
