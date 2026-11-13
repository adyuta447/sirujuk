"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex-1 min-w-0 max-w-md">
      <Search
        aria-hidden="true"
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Cari rujukan"
        placeholder="Cari no. rujukan, dokter, diagnosis"
        className="w-full min-h-11 pl-9 pr-3 py-2 text-sm rounded-4xl bg-[#F4F6F9] border border-transparent focus:bg-white focus:border-[#1E3A5F] focus:outline-none transition-colors placeholder:text-[#64748B]"
      />
    </div>
  );
}
