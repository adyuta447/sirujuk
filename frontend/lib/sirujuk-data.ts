export type RiskLevel = 'tinggi' | 'sedang' | 'rendah'
export type View = 'landing' | 'dashboard' | 'masuk' | 'queue' | 'detail' | 'audit' | 'analytics' | 'dokter' | 'klarifikasi' | 'dinkes' | 'skor'
export interface Alasan { judul: string; penjelasan: string }
export interface RujukanCase { id: string; noRujukan: string; pasien: string; usia: number; jenisPeserta: string; fasalOrigin: string; fasalTujuan: string; wilayah: string; diagnosa: string; dokter: string; tanggal: string; risk: RiskLevel; riskScore: number; alasan: Alasan[]; status: 'menunggu' | 'sedang-diaudit' | 'selesai' }
export type Keputusan = 'valid' | 'tidak-valid' | 'perlu-klarifikasi'
export const NAVY = '#1E3A5F'

export const RISK = {
  tinggi: { label: 'Risiko Tinggi', solid: '#C42222', soft: '#FBE9E9', text: '#9B1C1C' },
  sedang: { label: 'Perlu Ditinjau', solid: '#9A5A08', soft: '#FCF1E1', text: '#8A5406' },
  rendah: { label: 'Lolos', solid: '#17803F', soft: '#E4F4EA', text: '#146134' },
} as const

// Data

export const CASES: RujukanCase[] = [
  {
    id: '1', noRujukan: 'RJK-2024-08821', pasien: 'Bambang Sutrisno', usia: 52,
    jenisPeserta: 'PBI', fasalOrigin: 'Puskesmas Cilincing', fasalTujuan: 'RSUP Dr. Cipto Mangunkusumo',
    wilayah: 'Jakarta Utara', diagnosa: 'Hipertensi Esensial (I10)', dokter: 'dr. Andi Pratama',
    tanggal: '14 Agustus 2024', risk: 'tinggi', riskScore: 91,
    alasan: [
      { judul: 'Banyak pasien menuju rumah sakit yang sama', penjelasan: '69 dari 100 rujukan dokter ini menuju satu rumah sakit. Dokter lain di wilayah yang sama rata-rata hanya 22 dari 100.' },
      { judul: 'Rujukan untuk keluhan ringan cukup sering', penjelasan: 'Ada 12 rujukan dalam 30 hari untuk kondisi yang biasanya bisa ditangani di puskesmas.' },
      { judul: 'Alasan medisnya masih perlu dilengkapi', penjelasan: 'Catatan dokter masih terlalu umum dan belum menjelaskan kenapa pasien perlu ke spesialis.' },
    ],
    status: 'menunggu',
  },
  {
    id: '2', noRujukan: 'RJK-2024-08744', pasien: 'Sri Wahyuni', usia: 38,
    jenisPeserta: 'Pekerja', fasalOrigin: 'Klinik Mitra Sehat', fasalTujuan: 'RS Siloam Kebon Jeruk',
    wilayah: 'Jakarta Barat', diagnosa: 'Dispepsia Fungsional (K30)', dokter: 'dr. Rini Kusuma',
    tanggal: '13 Agustus 2024', risk: 'tinggi', riskScore: 84,
    alasan: [
      { judul: 'Banyak rujukan menuju rumah sakit yang sama', penjelasan: 'Lebih dari 80 dari 100 pasien dokter ini dikirim ke rumah sakit yang sama.' },
      { judul: 'Pemeriksaan awal belum terlihat', penjelasan: 'Pasien langsung dirujuk tanpa pemeriksaan dasar terlebih dahulu di klinik.' },
      { judul: 'Riwayat pasien belum mendukung', penjelasan: 'Belum ada catatan sakit sebelumnya yang menjelaskan perlunya penanganan rumah sakit.' },
    ],
    status: 'menunggu',
  },
  {
    id: '3', noRujukan: 'RJK-2024-08698', pasien: 'Hendra Wijaya', usia: 61,
    jenisPeserta: 'Mandiri', fasalOrigin: 'Puskesmas Penjaringan', fasalTujuan: 'RS Persahabatan',
    wilayah: 'Jakarta Utara', diagnosa: 'Diabetes dengan komplikasi (E11.6)', dokter: 'dr. Siti Aminah',
    tanggal: '12 Agustus 2024', risk: 'sedang', riskScore: 67,
    alasan: [
      { judul: 'Dokumen komplikasi belum lengkap', penjelasan: 'Komplikasi disebutkan tetapi belum didukung catatan pemeriksaan yang lengkap.' },
      { judul: 'Hasil lab terakhir belum ada', penjelasan: 'Hasil pemeriksaan gula darah terbaru belum dilampirkan di rekam medis.' },
    ],
    status: 'sedang-diaudit',
  },
  {
    id: '4', noRujukan: 'RJK-2024-08612', pasien: 'Dewi Rahayu', usia: 29,
    jenisPeserta: 'PBI', fasalOrigin: 'Puskesmas Tambora', fasalTujuan: 'RSCM Kencana',
    wilayah: 'Jakarta Barat', diagnosa: 'Anemia Kekurangan Zat Besi (D50)', dokter: 'dr. Budi Santoso',
    tanggal: '11 Agustus 2024', risk: 'sedang', riskScore: 58,
    alasan: [
      { judul: 'Hasil lab belum dilampirkan', penjelasan: 'Nilai kadar darah (Hb) yang jadi dasar diagnosis belum dicantumkan di surat rujukan.' },
    ],
    status: 'menunggu',
  },
  {
    id: '5', noRujukan: 'RJK-2024-08590', pasien: 'Muhamad Ilham', usia: 45,
    jenisPeserta: 'Pekerja', fasalOrigin: 'Klinik Pratama Karya', fasalTujuan: 'RSUD Pasar Rebo',
    wilayah: 'Jakarta Timur', diagnosa: 'Nyeri Punggung Bawah (M54.5)', dokter: 'dr. Rani Fitriani',
    tanggal: '10 Agustus 2024', risk: 'rendah', riskScore: 32, alasan: [], status: 'selesai',
  },
  {
    id: '6', noRujukan: 'RJK-2024-08471', pasien: 'Yuliana Sari', usia: 55,
    jenisPeserta: 'Mandiri', fasalOrigin: 'Puskesmas Cempaka Putih', fasalTujuan: 'RS Jakarta',
    wilayah: 'Jakarta Pusat', diagnosa: 'Gagal Jantung (I50)', dokter: 'dr. Hasan Basri',
    tanggal: '9 Agustus 2024', risk: 'rendah', riskScore: 22, alasan: [], status: 'selesai',
  },
]

export const DOKTER_RISIKO = [
  { nama: 'dr. Andi Pratama', fktp: 'Puskesmas Cilincing', totalRujukan: 142, risikoTinggi: 38, persentase: 26.8, narasi: 'Mengirim 69 dari 100 pasien ke rumah sakit yang sama, tiga kali lebih tinggi dari rata-rata puskesmas lain di wilayahnya.' },
  { nama: 'dr. Rini Kusuma', fktp: 'Klinik Mitra Sehat', totalRujukan: 98, risikoTinggi: 29, persentase: 29.6, narasi: 'Rujukan untuk keluhan lambung naik 40 persen dalam dua bulan tanpa pemeriksaan awal.' },
  { nama: 'dr. Siti Aminah', fktp: 'Puskesmas Penjaringan', totalRujukan: 76, risikoTinggi: 14, persentase: 18.4, narasi: 'Dokumen komplikasi penyakit kronis sering belum lengkap saat pasien dirujuk.' },
  { nama: 'dr. Budi Santoso', fktp: 'Puskesmas Tambora', totalRujukan: 54, risikoTinggi: 11, persentase: 20.4, narasi: 'Hasil lab pendukung masih sering belum ada di rujukan pasien anemia.' },
  { nama: 'dr. Maya Putri', fktp: 'Puskesmas Penjaringan', totalRujukan: 48, risikoTinggi: 9, persentase: 18.8, narasi: 'Rujukan ISPA ringan naik dalam sebulan terakhir tanpa pemeriksaan penunjang.' },
  { nama: 'dr. Agus Wijaya', fktp: 'Klinik Mitra Sehat', totalRujukan: 61, risikoTinggi: 12, persentase: 19.7, narasi: 'Konsentrasi tujuan ke satu RS di atas rata-rata wilayahnya.' },
]

export const slugDokter = (nama: string) => nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Data demo agregat per wilayah untuk Dinkes (tanpa data pasien).
export const DINKES_WILAYAH = [
  { wilayah: 'Jakarta Utara', faskes: 42, rujukan: 312, persenTinggi: 18.6, medianNS: 11, hhiRata: 2140 },
  { wilayah: 'Jakarta Barat', faskes: 51, rujukan: 287, persenTinggi: 15.1, medianNS: 9, hhiRata: 1820 },
  { wilayah: 'Jakarta Timur', faskes: 48, rujukan: 264, persenTinggi: 11.4, medianNS: 8, hhiRata: 1490 },
  { wilayah: 'Jakarta Pusat', faskes: 33, rujukan: 215, persenTinggi: 9.8, medianNS: 7, hhiRata: 1310 },
  { wilayah: 'Jakarta Selatan', faskes: 46, rujukan: 206, persenTinggi: 10.2, medianNS: 8, hhiRata: 1380 },
] as const

// Data demo: nilai asli datang dari backend (frontend tidak menghitung skor).
export const INDIKATOR_DEMO = [
  { label: 'Rujukan keluhan ringan (NS)', nilai: '42%', banding: 'Dokter sejenis: median 9%, P95 21% (n = 63)', level: 'tinggi' },
  { label: 'Konsentrasi rumah sakit tujuan (HHI)', nilai: '4.820', banding: 'Wajar < 1.500, perlu klarifikasi > 2.500', level: 'tinggi' },
  { label: 'Alat/SDM di faskes asal (SISRUTE)', nilai: 'Tersedia', banding: 'Alasan rujukan bilang alat terbatas. Data diperbarui 47 hari lalu, jadi bobotnya rendah.', level: 'sedang' },
  { label: 'Kesesuaian narasi dokter (NLP)', nilai: '0,31', banding: 'Di bawah 10% terendah, narasinya terlalu umum', level: 'sedang' },
] as const

export const AUDIT_CHECKLIST = [
  'Diagnosa sesuai dengan kemampuan fasilitas asal',
  'Pemeriksaan awal sudah dilakukan sebelum rujukan',
  'Catatan dokter mendukung alasan rujukan',
  'Tidak ada pola rujukan yang mencurigakan',
  'Rumah sakit tujuan sesuai kebutuhan pasien',
]

export const WILAYAH = ['Semua Wilayah', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Pusat', 'Jakarta Selatan']

// Undraw-style flat illustrations
