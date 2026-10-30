import type { DemoRole } from "../types/demo";

export const DEMO: DemoRole[] = [
  { peran: "verifikator", judul: "Verifikator BPJS", isi: "Antrean, detail, dan audit rujukan" },
  { peran: "tkmkb", judul: "Anggota TKMKB", isi: "Audit medis kasus berisiko tinggi" },
  { peran: "dinkes", judul: "Dinas Kesehatan", isi: "Pantauan per wilayah, tanpa data pasien" },
  { peran: "dokter", judul: "Dokter FKTP", isi: "Menjawab permintaan klarifikasi" },
];
