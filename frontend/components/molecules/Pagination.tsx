"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { halamanRingkas } from "../../lib/pagination";
import { NAVY } from "../../lib/sirujuk-data";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ page, totalPages, onChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;
  const awal = totalItems === undefined || pageSize === undefined ? null : (page - 1) * pageSize + 1;
  const akhir = totalItems === undefined || pageSize === undefined || awal === null ? null : Math.min(page * pageSize, totalItems);
  const tombol = (aktif: boolean) => ({
    backgroundColor: aktif ? NAVY : "#fff",
    color: aktif ? "#fff" : "#56657A",
    borderColor: aktif ? NAVY : "#DCE3EC",
  });
  return (
    <nav aria-label="Navigasi halaman" className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Halaman sebelumnya"
          className="min-h-11 min-w-11 px-3 py-2 rounded-4xl border transition-colors disabled:opacity-40 flex items-center justify-center"
          style={{ backgroundColor: "#fff", color: "#1E3A5F", borderColor: "#DCE3EC" }}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {halamanRingkas(page, totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`e-${i}`} aria-hidden="true" className="px-1 text-sm text-[#64748B]">…</span>
          ) : (
            <button
              type="button"
              key={n}
              onClick={() => onChange(n)}
              aria-label={`Halaman ${n}`}
              aria-current={n === page ? "page" : undefined}
              className="min-h-11 min-w-11 px-3 py-2 rounded-4xl text-sm font-mono font-bold border transition-colors"
              style={tombol(n === page)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Halaman berikutnya"
          className="min-h-11 min-w-11 px-3 py-2 rounded-4xl border transition-colors disabled:opacity-40 flex items-center justify-center"
          style={{ backgroundColor: "#fff", color: "#1E3A5F", borderColor: "#DCE3EC" }}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      {awal !== null && akhir !== null && totalItems !== undefined && (
        <p role="status" className="text-xs text-[#64748B]">
          Menampilkan {awal}–{akhir} dari {totalItems}
        </p>
      )}
    </nav>
  );
}
