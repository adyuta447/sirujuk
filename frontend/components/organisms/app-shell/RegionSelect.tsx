import { ChevronDown, MapPin } from "lucide-react";

interface RegionSelectProps {
  value: string;
  options: string[];
  onChange: (w: string) => void;
}

export function RegionSelect({ value, options, onChange }: RegionSelectProps) {
  return (
    <div className="relative">
      <MapPin
        aria-hidden="true"
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
      />
      <select
        aria-label="Pilih wilayah"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-sm font-semibold text-[#0E1B2A] bg-[#F4F6F9] rounded-4xl pl-9 pr-9 py-2 min-h-11 border border-transparent hover:border-[#DCE3EC] focus:outline-none focus:border-[#1E3A5F] cursor-pointer"
      >
        {options.map((w) => (
          <option key={w}>{w}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
      />
    </div>
  );
}
