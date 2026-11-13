import type { Alasan } from "../../../lib/sirujuk-data";

interface ReasonItemProps {
  nomor: number;
  alasan: Alasan;
  warna: string;
}

export function ReasonItem({ nomor, alasan, warna }: ReasonItemProps) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <span
        className="w-6 h-6 rounded-4xl flex items-center justify-center text-xs font-bold shrink-0 text-white"
        style={{ backgroundColor: warna }}
      >
        {nomor}
      </span>
      <div>
        <div className="font-semibold text-sm text-[#0E1B2A]">{alasan.judul}</div>
        <p className="text-sm text-[#56657A] mt-0.5 leading-relaxed">{alasan.penjelasan}</p>
      </div>
    </div>
  );
}
