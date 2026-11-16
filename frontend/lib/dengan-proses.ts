import { PROSES } from "../data/proses-dialog";
import { useAktivitasStore } from "../store/useAktivitasStore";
import { useProsesStore } from "../store/useProsesStore";
import type { KunciProses } from "../types/proses";
import { pesanGalat } from "./pesan-galat";

/**
 * Menjalankan `kerja` sambil menampilkan pop-up status: sedang diproses, lalu berhasil (bila aksinya punya pesan
 * berhasil) atau gagal dengan pesan galatnya. Setiap hasil juga dicatat di daftar aktivitas, dengan `konteks` (mis. nomor
 * rujukan) bila ada. Galatnya tetap dilempar ulang, jadi penanganan di pemanggil tidak berubah.
 */
export async function denganProses<T>(kunci: KunciProses, kerja: () => Promise<T>, konteks?: string): Promise<T> {
  useProsesStore.getState().mulai(kunci);
  try {
    const hasil = await kerja();
    useAktivitasStore.getState().catat({ kunci, jenis: "berhasil", judul: PROSES[kunci].aktivitas, konteks });
    if (PROSES[kunci].berhasil) useProsesStore.getState().tampilkanHasil({ jenis: "berhasil", kunci });
    return hasil;
  } catch (e) {
    const pesan = pesanGalat(e);
    useAktivitasStore.getState().catat({ kunci, jenis: "gagal", judul: PROSES[kunci].gagal, konteks, pesan });
    useProsesStore.getState().tampilkanHasil({ jenis: "gagal", kunci, pesan });
    throw e;
  } finally {
    useProsesStore.getState().selesai(kunci);
  }
}
