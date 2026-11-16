import { useProsesStore } from "../store/useProsesStore";
import type { KunciProses } from "../types/proses";

/** Menjalankan `kerja` sambil mendaftarkannya sebagai proses berjalan, supaya pop-up tampil. Selalu dibereskan, juga saat gagal. */
export async function denganProses<T>(kunci: KunciProses, kerja: () => Promise<T>): Promise<T> {
  useProsesStore.getState().mulai(kunci);
  try {
    return await kerja();
  } finally {
    useProsesStore.getState().selesai(kunci);
  }
}
