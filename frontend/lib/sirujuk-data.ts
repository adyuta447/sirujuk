export type RiskLevel = 'tinggi' | 'sedang' | 'rendah'
export type View = 'landing' | 'dashboard' | 'masuk' | 'queue' | 'detail' | 'audit' | 'analytics' | 'dokter' | 'klarifikasi' | 'dinkes' | 'skor'
export interface Alasan { judul: string; penjelasan: string }
export interface Indikator { label: string; nilai: string; banding: string; level: RiskLevel }
export interface RiwayatSkor { skor: number; tanggal: string; versiModel: string }
export interface Klarifikasi { penulis: string; teks: string; tanggal: string }
export interface RujukanCase { id: string; noRujukan: string; pasien: string; usia?: number; jenisPeserta?: string; fasalOrigin: string; fasalTujuan: string; wilayah: string; diagnosa: string; dokter: string; tanggal: string; risk: RiskLevel; riskScore: number; alasan: Alasan[]; status: 'menunggu' | 'sedang-diaudit' | 'selesai'; synthetic?: boolean; sumber?: string; skorDummy?: boolean; claimStatus?: 'normal' | 'ditahan' | 'dilepas' | 'temuan-terkonfirmasi'; indikator?: Indikator[]; riwayatSkor?: RiwayatSkor[]; klarifikasi?: Klarifikasi[]; narasi?: string; alasanRujukan?: string; kodeAlasan?: string }
export type Keputusan = 'valid' | 'tidak-valid' | 'perlu-klarifikasi'
export const NAVY = '#1E3A5F'

export const RISK = {
  tinggi: { label: 'Risiko Tinggi', solid: '#C42222', soft: '#FBE9E9', text: '#9B1C1C' },
  sedang: { label: 'Perlu Ditinjau', solid: '#9A5A08', soft: '#FCF1E1', text: '#8A5406' },
  rendah: { label: 'Lolos', solid: '#17803F', soft: '#E4F4EA', text: '#146134' },
} as const

// Data

export const slugDokter = (nama: string) => nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Direktori ID dokter seed (d-001..d-006) ke nama tampilan. Backend belum
// punya direktori dokter, jadi pemetaan tinggal di sini sampai ada.
export const NAMA_DOKTER: Record<string, string> = {
  "d-001": "dr. Andi Pratama",
  "d-002": "dr. Rini Kusuma",
  "d-003": "dr. Siti Aminah",
  "d-004": "dr. Budi Santoso",
  "d-005": "dr. Maya Putri",
  "d-006": "dr. Agus Wijaya",
};

export const namaDokter = (id: string) => NAMA_DOKTER[id] ?? id;

export const AUDIT_CHECKLIST = [
  'Diagnosa sesuai dengan kemampuan fasilitas asal',
  'Pemeriksaan awal sudah dilakukan sebelum rujukan',
  'Catatan dokter mendukung alasan rujukan',
  'Tidak ada pola rujukan yang mencurigakan',
  'Rumah sakit tujuan sesuai kebutuhan pasien',
]


// Undraw-style flat illustrations
