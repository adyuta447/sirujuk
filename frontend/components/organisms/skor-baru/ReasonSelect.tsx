import { ChevronDown } from "lucide-react";
import { ALASAN } from "../../../data/skor-reasons";
import { AUTH_INPUT_CLASS } from "../../../lib/ui-classes";

export function ReasonSelect() {
  return (
    <div>
      <label htmlFor="reason" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">Alasan rujukan</label>
      <div className="relative">
        <select id="reason" name="reason" defaultValue="" className={`${AUTH_INPUT_CLASS} appearance-none pr-12 cursor-pointer`}>
          <option value="" disabled>Pilih alasan</option>
          {ALASAN.map((x) => (
            <option key={x.kategori} value={x.kategori}>{x.teks}</option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#56657A]" />
      </div>
    </div>
  );
}
