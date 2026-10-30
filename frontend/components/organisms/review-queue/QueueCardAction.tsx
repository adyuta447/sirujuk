import { Check, ChevronRight } from "lucide-react";
import type { RujukanCase } from "../../../lib/sirujuk-data";
import { PrimaryButton } from "../../atoms/PrimaryButton";

interface QueueCardActionProps {
  kasus: RujukanCase;
  onSelect: (c: RujukanCase) => void;
}

export function QueueCardAction({ kasus, onSelect }: QueueCardActionProps) {
  if (kasus.status === "selesai") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-[#56657A]">
        <Check size={16} /> Selesai
      </span>
    );
  }
  return (
    <PrimaryButton onClick={() => onSelect(kasus)} className="w-full sm:w-auto px-5 py-2.5 text-sm whitespace-nowrap">
      Cek rujukan <ChevronRight size={16} />
    </PrimaryButton>
  );
}
