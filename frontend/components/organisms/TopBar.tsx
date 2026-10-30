import { MapPin } from "lucide-react";
import { periodeSekarang } from "../../lib/formatters";
import { WILAYAH } from "../../lib/sirujuk-data";
import { SearchBar } from "../molecules/SearchBar";
import { RegionSelect } from "./app-shell/RegionSelect";

interface TopBarProps {
  wilayah: string;
  setWilayah: (w: string) => void;
  query: string;
  setQuery: (q: string) => void;
  pilihan?: string[];
}

export function TopBar({
  wilayah,
  setWilayah,
  query,
  setQuery,
  pilihan = WILAYAH,
}: TopBarProps) {
  return (
    <div className="min-h-16 shrink-0 mx-3 sm:mx-4 mt-3 sm:mt-4 bg-white border border-[#DCE3EC] rounded-4xl flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sticky top-3 sm:top-4 z-20">
      <SearchBar value={query} onChange={setQuery} />
      <div className="sm:ml-auto flex items-center gap-2">
        <MapPin
          aria-hidden="true"
          size={15}
          className="text-[#64748B] hidden sm:block"
        />
        <RegionSelect value={wilayah} options={pilihan} onChange={setWilayah} />
      </div>
      <div className="hidden md:block pl-3 ml-1 border-l border-[#DCE3EC] text-right">
        <div className="text-[11px] text-[#64748B]">Periode</div>
        <div className="font-mono text-xs font-semibold text-[#0E1B2A]">
          {periodeSekarang()}
        </div>
      </div>
    </div>
  );
}
