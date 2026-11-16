import type { KartuStat } from "../../types/dashboard";
import { Card } from "../atoms/Card";
import { Illustration } from "../atoms/Illustration";

interface StatCardProps {
  data: KartuStat;
  className?: string;
}

/** Kartu angka besar dengan ikon, keterangan, dan ilustrasi. Dipakai Beranda (bisa diklik) dan Analitik. */
export function StatCard({ data: { label, val, sub, Icon, art }, className = "" }: StatCardProps) {
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-2 text-[#64748B]">
        <Icon size={15} />
        <span className="text-xs font-semibold text-[#56657A]">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <div>
          <div className="font-mono text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0E1B2A]">{val}</div>
          <div className="text-xs text-[#64748B] mt-1">{sub}</div>
        </div>
        <Illustration name={art} className="hidden sm:block w-20 h-16 shrink-0" />
      </div>
    </Card>
  );
}
