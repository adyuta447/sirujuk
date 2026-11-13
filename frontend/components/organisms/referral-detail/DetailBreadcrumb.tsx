import { ChevronRight } from "lucide-react";

interface DetailBreadcrumbProps {
  noRujukan: string;
  onBack: () => void;
}

export function DetailBreadcrumb({ noRujukan, onBack }: DetailBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#56657A]">
      <button type="button" onClick={onBack} className="min-h-11 hover:text-[#1E3A5F] transition-colors font-medium">
        Kembali ke antrean
      </button>
      <ChevronRight size={14} />
      <span className="text-[#0E1B2A] font-semibold font-mono">{noRujukan}</span>
    </div>
  );
}
