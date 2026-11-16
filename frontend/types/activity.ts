/** Hasil sebuah aksi menurut backend: 2xx ok; 401/403/429 denied; 4xx lain rejected; 5xx failed. */
export type HasilAktivitas = "ok" | "denied" | "rejected" | "failed";

/** Satu baris log aktivitas dari backend. `detail` hanya nama kolom atau kata hasil, tidak pernah teks pasien. */
export interface EntriAktivitas {
  id: string;
  at: string;
  actor: string; // kosong bila tidak ada yang masuk (login gagal)
  role: string;
  action: string;
  resource: string;
  resource_id?: string;
  outcome: HasilAktivitas;
  status: number;
  detail?: string[];
}

export interface HalamanAktivitas {
  items: EntriAktivitas[];
  next: string; // kosong di halaman terakhir
}

export interface FilterAktivitas {
  outcome?: HasilAktivitas;
  resource?: string;
  referral_id?: string;
}
