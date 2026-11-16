import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Aktivitas } from "../types/aktivitas";

const MAKS = 100;

type AktivitasState = {
  daftar: Aktivitas[]; // terbaru di depan
  catat: (a: Omit<Aktivitas, "id" | "waktu" | "dibaca">) => void;
  tandaiDibaca: () => void;
  kosongkan: () => void;
};

// Disimpan di sessionStorage: hilang saat tab ditutup dan dikosongkan saat keluar. Dipulihkan manual (skipHydration)
// dari ProsesHost sesudah mount, supaya render pertama di server dan di klien sama.
export const useAktivitasStore = create<AktivitasState>()(
  persist(
    (set) => ({
      daftar: [],
      catat: (a) =>
        set((s) => ({
          daftar: [{ ...a, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, waktu: new Date().toISOString(), dibaca: false }, ...s.daftar].slice(0, MAKS),
        })),
      tandaiDibaca: () => set((s) => (s.daftar.some((a) => !a.dibaca) ? { daftar: s.daftar.map((a) => ({ ...a, dibaca: true })) } : s)),
      kosongkan: () => set({ daftar: [] }),
    }),
    { name: "sirujuk-aktivitas", storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ daftar: s.daftar }), skipHydration: true },
  ),
);
