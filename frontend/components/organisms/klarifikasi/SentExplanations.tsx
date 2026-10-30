import type { RujukanCase } from "../../../lib/sirujuk-data";
import { TitledCard } from "../../molecules/TitledCard";

interface SentExplanationsProps {
  klarifikasi: NonNullable<RujukanCase["klarifikasi"]>;
}

export function SentExplanations({ klarifikasi }: SentExplanationsProps) {
  return (
    <TitledCard title="Penjelasan yang sudah dikirim">
      <ul className="mt-3 divide-y divide-[#EEF1F5]">
        {klarifikasi.map((k) => (
          <li key={k.tanggal} className="py-3">
            <div className="text-xs text-[#56657A]">{k.penulis}, {new Date(k.tanggal).toLocaleDateString("id-ID")}</div>
            <p className="text-sm text-[#0E1B2A] mt-1 whitespace-pre-line">{k.teks}</p>
          </li>
        ))}
      </ul>
    </TitledCard>
  );
}
