import { ArrowRight } from "lucide-react";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { PrimaryButton } from "../../atoms/PrimaryButton";
import { SecondaryButton } from "../../atoms/SecondaryButton";

interface DetailActionBarProps {
  kasus: RujukanCase;
  hanyaTkmkb: boolean;
  onAudit: (k: RujukanCase) => void;
  onKlarifikasi: (k: RujukanCase) => void;
}

export function DetailActionBar({ kasus, hanyaTkmkb, onAudit, onKlarifikasi }: DetailActionBarProps) {
  return (
    <div className="sticky bottom-0 bg-[#F4F6F9] pt-3 pb-1">
      <div className="flex flex-col sm:flex-row gap-3">
        {hanyaTkmkb ? (
          <p role="note" className="flex-1 rounded-4xl px-4 py-3 text-sm bg-[#1E3A5F] text-white">
            Kasus risiko tinggi diputuskan oleh TKMKB.
          </p>
        ) : (
          <PrimaryButton onClick={() => onAudit(kasus)} className="flex-1 py-3.5">
            Cek rujukan ini <ArrowRight size={18} />
          </PrimaryButton>
        )}
        <SecondaryButton onClick={() => onKlarifikasi(kasus)}>Minta klarifikasi dokter</SecondaryButton>
      </div>
    </div>
  );
}
