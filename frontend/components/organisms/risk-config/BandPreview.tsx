import { RISK } from "../../../lib/sirujuk-data";

interface BandPreviewProps {
  yellow: number;
  red: number;
}

/** Tiga pita skor 0 sampai 100 menurut batas yang sedang diisi. Warna dan teks, bukan warna saja. */
export function BandPreview({ yellow, red }: BandPreviewProps) {
  if (!(yellow >= 1 && red <= 100 && yellow < red)) return null;
  const pita = [
    { teks: `Hijau: di bawah ${yellow}`, lebar: yellow, warna: RISK.rendah.solid },
    { teks: `Kuning: ${yellow} sampai di bawah ${red}`, lebar: red - yellow, warna: RISK.sedang.solid },
    { teks: `Merah: ${red} ke atas`, lebar: 100 - red, warna: RISK.tinggi.solid },
  ];
  return (
    <div>
      <div className="flex h-3 rounded-4xl overflow-hidden" role="img" aria-label={pita.map((p) => p.teks).join(". ")}>
        {pita.map((p) => (
          <div key={p.teks} style={{ width: `${p.lebar}%`, backgroundColor: p.warna }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#56657A]">
        {pita.map((p) => (
          <li key={p.teks}>{p.teks}</li>
        ))}
      </ul>
    </div>
  );
}
