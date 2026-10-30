import { ChevronRight } from "lucide-react";

interface DoctorBreadcrumbProps {
  nama: string;
  onAll: () => void;
}

export function DoctorBreadcrumb({ nama, onAll }: DoctorBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#56657A]">
      <button type="button" onClick={onAll} className="min-h-11 font-medium hover:text-[#1E3A5F]">Semua dokter</button>
      <ChevronRight aria-hidden="true" size={14} />
      <span className="font-semibold text-[#0E1B2A]">{nama}</span>
    </div>
  );
}
