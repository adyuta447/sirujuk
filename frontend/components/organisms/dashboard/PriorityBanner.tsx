import { ArrowRight } from "lucide-react";
import { NAVY } from "../../../lib/sirujuk-data";
import { Illustration } from "../../atoms/Illustration";

interface PriorityBannerProps {
  count: number;
  onOpenQueue: () => void;
}

export function PriorityBanner({ count, onOpenQueue }: PriorityBannerProps) {
  return (
    <div
      className="rounded-4xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-white"
      style={{ backgroundColor: NAVY }}
    >
      <Illustration name="dashboard" className="hidden sm:block w-36 h-28 shrink-0" />
      <div className="flex-1 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
        {count} rujukan berisiko tinggi belum dicek
      </div>
      <button
        type="button"
        onClick={onOpenQueue}
        className="shrink-0 inline-flex items-center justify-center gap-2 min-h-11 bg-white font-semibold px-5 py-3 rounded-4xl transition-transform hover:scale-[1.02]"
        style={{ color: NAVY }}
      >
        Lihat antrean <ArrowRight size={18} />
      </button>
    </div>
  );
}
