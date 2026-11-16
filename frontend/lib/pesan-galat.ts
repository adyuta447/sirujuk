// Pesan 409 untuk pengguna. Kode dari backend; kode yang belum dikenal jatuh ke pesan umum, bukan teks mentah backend.
const PESAN_409: Record<string, string> = {
  IDEMPOTENCY_CONFLICT: "Nomor rujukan ini sudah dipakai untuk isi yang berbeda. Gunakan nomor rujukan baru.",
  CONFIG_STALE: "Pengaturan sudah diubah orang lain. Muat ulang halaman, lalu coba lagi.",
  LIMIT_REACHED: "Batas untuk rujukan ini sudah tercapai.",
};
const UMUM_409 = "Rujukan sudah final atau baru saja berubah. Muat ulang halaman, lalu coba lagi.";

// 403 dari backend berbahasa Inggris; tampilkan Indonesia. Kode lain tetap memakai pesan dari server.
const PESAN_403: Record<string, string> = {
  FORBIDDEN_ROLE: "Keputusan ini hanya boleh diambil anggota TKMKB.",
  FORBIDDEN_LEVEL: "Rujukan berisiko tinggi hanya boleh diproses anggota TKMKB.",
  FORBIDDEN_OWNER: "Anda hanya bisa menjawab rujukan milik Anda sendiri.",
};

export const pesan403 = (code?: string) => (code ? PESAN_403[code] : undefined);
export const pesan409 = (code?: string) => (code && PESAN_409[code]) || UMUM_409;
