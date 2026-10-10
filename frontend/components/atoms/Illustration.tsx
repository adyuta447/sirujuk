export type IllustrationName =
  | "hero"
  | "dashboard"
  | "antrean-kosong"
  | "analitik"
  | "audit"
  | "klarifikasi"
  | "dinkes"
  | "tidak-ditemukan"
  | "selesai"
  | "sapaan"
  | "stat-masuk"
  | "stat-cek"
  | "stat-antre"
  | "stat-selesai"
  | "pintasan-klarifikasi"
  | "pintasan-wilayah"
  | "pintasan-analitik"
  | "dinkes-terang"
  | "analitik-terang"
  | "klarifikasi-terang"
  | "selesai-terang";

// File ada di public/illustrations, diunduh manual dari unDraw (lihat SOURCES.md).
export function Illustration({ name, className = "" }: { name: IllustrationName; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/illustrations/${name}.svg`} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
}
