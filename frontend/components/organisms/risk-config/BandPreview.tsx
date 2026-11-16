import { RISK } from "../../../lib/sirujuk-data";

const UJUNG_DEKAT = 8; // persen dari ujung skala

interface BandPreviewProps {
  yellow: number;
  red: number;
}

/**
 * Skala skor 0 sampai 100 menurut batas yang sedang diisi: tiga segmen bernama, patok tegak di batas kuning dan
 * merah beserta angkanya. Semua posisi dalam persen, jadi skalanya ikut melebar dan menyempit; nama segmen dipotong
 * di segmen sempit, sedangkan angka batas selalu terbaca. Ringkasannya ada di aria-label untuk pembaca layar.
 */
export function BandPreview({ yellow, red }: BandPreviewProps) {
  if (!(yellow >= 1 && red <= 100 && yellow < red)) return null;
  const segmen = [
    { nama: "Hijau", lebar: yellow, warna: RISK.rendah.solid },
    { nama: "Kuning", lebar: red - yellow, warna: RISK.sedang.solid },
    { nama: "Merah", lebar: 100 - red, warna: RISK.tinggi.solid },
  ];
  const patok = [yellow, red];
  return (
    <div
      role="img"
      aria-label={`Skala skor 0 sampai 100: hijau di bawah ${yellow}, kuning ${yellow} sampai di bawah ${red}, merah ${red} ke atas.`}
      className="relative h-[4.25rem] pt-1"
    >
      <div className="flex h-8 rounded-4xl overflow-hidden text-[11px] font-bold text-white">
        {segmen.map((s) => (
          <div key={s.nama} style={{ width: `${s.lebar}%`, backgroundColor: s.warna }} className="flex items-center justify-center px-2 min-w-0">
            <span className="truncate">{s.nama}</span>
          </div>
        ))}
      </div>
      {patok.map((nilai) => (
        <div key={nilai} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${nilai}%` }}>
          <span className="w-0.5 h-11 bg-[#0E1B2A]" />
          <span className="mt-0.5 font-mono text-xs font-bold text-[#0E1B2A]">{nilai}</span>
        </div>
      ))}
      {/* Angka ujung disembunyikan bila patok terlalu dekat, supaya tidak bertumpuk di layar sempit. */}
      {yellow > UJUNG_DEKAT && <span className="absolute left-0 top-[2.75rem] font-mono text-[11px] text-[#64748B]">0</span>}
      {red < 100 - UJUNG_DEKAT && <span className="absolute right-0 top-[2.75rem] font-mono text-[11px] text-[#64748B]">100</span>}
    </div>
  );
}
