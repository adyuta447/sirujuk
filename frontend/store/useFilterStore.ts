import { create } from "zustand";
import { DEFAULT_REGION } from "../lib/constants";

// Filter shell disimpan di sini supaya tidak reset saat pindah halaman.
type FilterState = {
  wilayah: string;
  query: string;
  setWilayah: (wilayah: string) => void;
  setQuery: (query: string) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  wilayah: DEFAULT_REGION,
  query: "",
  setWilayah: (wilayah) => set({ wilayah }),
  setQuery: (query) => set({ query }),
}));
