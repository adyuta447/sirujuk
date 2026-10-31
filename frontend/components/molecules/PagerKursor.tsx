import { ChevronLeft, ChevronRight } from "lucide-react";

interface PagerKursorProps {
  halaman: number;
  jumlahTampil: number;
  total: number;
  pageSize: number;
  adaSebelum: boolean;
  adaLanjut: boolean;
  onSebelum: () => void;
  onBerikut: () => void;
}

const TOMBOL = "min-h-11 px-4 py-2 rounded-4xl border border-[#DCE3EC] bg-white text-sm font-semibold text-[#1E3A5F] transition-colors disabled:opacity-40 inline-flex items-center gap-1.5";

/** Navigasi halaman untuk daftar berkursor: hanya maju dan mundur, karena server tidak melompat ke halaman tertentu. */
export function PagerKursor({ halaman, jumlahTampil, total, pageSize, adaSebelum, adaLanjut, onSebelum, onBerikut }: PagerKursorProps) {
  if (!adaSebelum && !adaLanjut) return null;
  const awal = (halaman - 1) * pageSize + 1;
  return (
    <nav aria-label="Navigasi halaman" className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center gap-2">
        <button type="button" disabled={!adaSebelum} onClick={onSebelum} className={TOMBOL}>
          <ChevronLeft size={16} aria-hidden="true" /> Sebelumnya
        </button>
        <button type="button" disabled={!adaLanjut} onClick={onBerikut} className={TOMBOL}>
          Berikutnya <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <p role="status" className="text-xs text-[#64748B]">
        Menampilkan {awal}–{awal + jumlahTampil - 1} dari {total}
      </p>
    </nav>
  );
}
