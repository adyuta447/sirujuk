import { PROSES } from "../data/proses-dialog";
import { useProsesStore } from "../store/useProsesStore";
import type { KunciProses } from "../types/proses";
import { pesanGalat } from "./pesan-galat";

/**
 * Menjalankan `kerja` sambil menampilkan pop-up status: sedang diproses, lalu berhasil (bila aksinya punya pesan
 * berhasil) atau gagal dengan pesan galatnya. Galatnya tetap dilempar ulang, jadi penanganan di pemanggil tidak berubah.
 */
export async function denganProses<T>(kunci: KunciProses, kerja: () => Promise<T>): Promise<T> {
  useProsesStore.getState().mulai(kunci);
  try {
    const hasil = await kerja();
    if (PROSES[kunci].berhasil) useProsesStore.getState().tampilkanHasil({ jenis: "berhasil", kunci });
    return hasil;
  } catch (e) {
    useProsesStore.getState().tampilkanHasil({ jenis: "gagal", kunci, pesan: pesanGalat(e) });
    throw e;
  } finally {
    useProsesStore.getState().selesai(kunci);
  }
}
