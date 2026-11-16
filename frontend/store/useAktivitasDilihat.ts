import { create } from "zustand";

// Batas "sudah dilihat" untuk lonceng: entri dengan waktu sesudah ini dihitung baru. Hanya di memori, jadi muat ulang
// halaman mengulang dari entri terbaru saat itu. null = belum ada dasar; diisi saat data pertama tiba.
type DilihatState = {
  dilihat: string | null;
  tandai: (waktu: string) => void;
  reset: () => void;
};

export const useAktivitasDilihat = create<DilihatState>((set) => ({
  dilihat: null,
  tandai: (waktu) => set((s) => (s.dilihat !== null && waktu <= s.dilihat ? s : { dilihat: waktu })),
  reset: () => set({ dilihat: null }),
}));
