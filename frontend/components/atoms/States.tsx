import type { ReactNode } from "react";

/** Tiga keadaan standar halaman: memuat, kosong, dan gagal. Pesan selalu menyebut sebab dan langkah berikutnya. */
export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="text-sm text-[#56657A]">
      {label}…
    </p>
  );
}

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="bg-white rounded-4xl border border-[#DCE3EC] py-10 px-4 flex flex-col items-center text-center">
      <p className="font-bold text-[#0E1B2A]">{title}</p>
      {body && <p className="text-sm text-[#56657A] mt-1 max-w-sm">{body}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-4xl border border-[#DCE3EC] bg-white p-5 flex flex-wrap items-center gap-3">
      <p className="text-sm font-semibold text-[#9B1C1C] flex-1 min-w-0">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 px-5 rounded-4xl bg-[#1E3A5F] hover:bg-[#16304F] text-white text-sm font-bold"
      >
        Coba lagi
      </button>
    </div>
  );
}
