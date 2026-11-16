export type UbahFormSimulasi = (kolom: keyof FormSimulasi, nilai: string) => void;

/** Isian simulator sebagai teks. Kosong = tidak diubah (memakai nilai rujukan dasar). */
export interface FormSimulasi {
  baseId: string;
  diagnosis: string;
  alasan: string;
  n90: string;
  ns90: string; // persen 0-100
  n180: string;
  hhi180: string;
  dominan: string; // "" | "ya" | "tidak"
  sisrute: string; // "" | "ya" | "tidak"
  umurSisrute: string; // hari
  terdekat: string; // "" | "ya" | "tidak": RS tujuan adalah yang terdekat
  jarak: string; // km
  kompetensi: string; // "" | sesuai | sebagian | tidak
  alat: string; // "" | "ya" | "tidak"
}
