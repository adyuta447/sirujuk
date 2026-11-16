import { create } from "zustand";
import type { HasilProses, KunciProses } from "../types/proses";

// Aksi yang sedang berjalan (yang tertua ditampilkan) dan hasil aksi terakhir yang belum ditutup.
type ProsesState = {
  antrean: KunciProses[];
  hasil: HasilProses | null;
  mulai: (kunci: KunciProses) => void;
  selesai: (kunci: KunciProses) => void;
  tampilkanHasil: (hasil: HasilProses) => void;
  tutupHasil: () => void;
};

export const useProsesStore = create<ProsesState>((set) => ({
  antrean: [],
  hasil: null,
  // Aksi baru menggantikan hasil lama yang masih terbuka.
  mulai: (kunci) => set((s) => ({ antrean: [...s.antrean, kunci], hasil: null })),
  selesai: (kunci) =>
    set((s) => {
      const i = s.antrean.indexOf(kunci);
      return { antrean: i < 0 ? s.antrean : [...s.antrean.slice(0, i), ...s.antrean.slice(i + 1)] };
    }),
  tampilkanHasil: (hasil) => set({ hasil }),
  tutupHasil: () => set({ hasil: null }),
}));
