// Kalimat untuk pasangan resource.action dari log backend. Yang belum ada di sini jatuh ke "action resource" apa adanya.
export const KALIMAT_AKTIVITAS: Record<string, string> = {
  "referral.create": "Membuat rujukan baru",
  "referral.read": "Membuka rujukan",
  "referral.list": "Melihat daftar rujukan",
  "referral.update": "Mengubah rujukan",
  "referral.rescore": "Menghitung ulang skor rujukan",
  "referral.delete": "Mengarsipkan rujukan",
  "clarification.create": "Mengirim klarifikasi",
  "audit.create": "Menyimpan hasil audit",
  "simulation.simulate": "Menjalankan simulasi",
  "config.read": "Melihat pengaturan risiko",
  "config.update": "Mengubah pengaturan risiko",
  "session.login": "Masuk",
  "session.logout": "Keluar",
};
