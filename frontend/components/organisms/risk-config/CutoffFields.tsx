import { FIELD_CLASS } from "../../../lib/ui-classes";
import { FieldGrid } from "../../molecules/FieldGrid";

interface CutoffFieldsProps {
  yellow: string;
  red: string;
  disabled: boolean;
  onYellow: (v: string) => void;
  onRed: (v: string) => void;
}

export function CutoffFields({ yellow, red, disabled, onYellow, onRed }: CutoffFieldsProps) {
  return (
    <FieldGrid kolom={2}>
      <label className="block text-xs font-semibold text-[#56657A]">
        Kuning mulai dari skor
        <input type="number" inputMode="decimal" min={1} max={100} value={yellow} disabled={disabled} onChange={(e) => onYellow(e.target.value)} className={`${FIELD_CLASS} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-[#56657A]">
        Merah mulai dari skor
        <input type="number" inputMode="decimal" min={1} max={100} value={red} disabled={disabled} onChange={(e) => onRed(e.target.value)} className={`${FIELD_CLASS} mt-1`} />
      </label>
    </FieldGrid>
  );
}
