import type { Peran } from "../akses";

// Akun demo: hanya aktif bila DEMO_MODE=true di server (default mati) dan bukan deployment produksi (lihat demoAktif).
// Tetap lewat sesi bertanda tangan dan pembatasan peran yang sama; bedanya tanpa kata sandi, dan masa berlaku lebih pendek.
export const TTL_DEMO_DETIK = 2 * 60 * 60;

// Harus sama dengan akun yang disiapkan backend (backend-go/internal/seed/demo_users.go, DEMO_ACCOUNTS=true):
// backend mencari pelaku dari X-Actor di daftar akunnya, jadi sub palsu seperti "demo-<peran>" ditolak sebagai tak dikenal.
export const EMAIL_DEMO: Record<Peran, string> = {
  verifikator: "verifikator@demo.sirujuk.id",
  tkmkb: "tkmkb@demo.sirujuk.id",
  dinkes: "dinkes@demo.sirujuk.id",
  dokter: "dokter@demo.sirujuk.id",
};
