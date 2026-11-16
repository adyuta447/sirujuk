import { create } from "zustand";
import type { KunciProses } from "../types/proses";

// Aksi yang sedang berjalan, berurutan. Lebih dari satu bisa berjalan bersamaan; yang tertua yang ditampilkan.
type ProsesState = {
  antrean: KunciProses[];
  mulai: (kunci: KunciProses) => void;
  selesai: (kunci: KunciProses) => void;
};

export const useProsesStore = create<ProsesState>((set) => ({
  antrean: [],
  mulai: (kunci) => set((s) => ({ antrean: [...s.antrean, kunci] })),
  selesai: (kunci) =>
    set((s) => {
      const i = s.antrean.indexOf(kunci);
      return { antrean: i < 0 ? s.antrean : [...s.antrean.slice(0, i), ...s.antrean.slice(i + 1)] };
    }),
}));
