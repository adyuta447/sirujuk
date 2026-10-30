import type { useDokterStats, useWilayahStats } from "../hooks/useStats";

/** Profil risiko satu dokter, bentuk tampilan dari useDokterStats. */
export type DokterStat = NonNullable<ReturnType<typeof useDokterStats>["data"]>[number];

/** Agregat satu wilayah, bentuk tampilan dari useWilayahStats. */
export type WilayahStat = NonNullable<ReturnType<typeof useWilayahStats>["data"]>[number];
