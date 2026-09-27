"use client";

import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <div className="relative flex-1 max-w-md">
      <Search
        aria-hidden="true"
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A98AC]"
      />
      <input
        type="search"
        aria-label="Cari rujukan"
        placeholder="Cari rujukan, pasien, atau dokter"
        className="w-full pl-9 pr-3 py-2 text-sm rounded-4xl bg-[#F4F6F9] border border-transparent focus:bg-white focus:border-[#1E3A5F] focus:outline-none transition-colors placeholder:text-[#8A98AC]"
      />
    </div>
  );
}
