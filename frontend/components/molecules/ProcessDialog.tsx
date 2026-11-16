"use client";

import { useEffect, useId, useRef } from "react";
import type { TampilanProses } from "../../types/proses";
import { Illustration } from "../atoms/Illustration";

interface ProcessDialogProps {
  tampilan: TampilanProses;
}

/** Pop-up di tengah layar selama aksi berjalan: ilustrasi, judul besar, lalu penjelasan, semuanya di tengah. Menutup halaman di belakangnya. */
export function ProcessDialog({ tampilan: { art, judul, isi } }: ProcessDialogProps) {
  const idJudul = useId();
  const idIsi = useId();
  const ref = useRef<HTMLDivElement>(null);

  // Fokus pindah ke dialog supaya tombol di halaman belakang tidak bisa ditekan lewat keyboard selama proses.
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2A]/60">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby={idJudul}
        aria-describedby={idIsi}
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-4xl border border-[#DCE3EC] px-8 py-10 flex flex-col items-center text-center outline-none"
      >
        <Illustration name={art} className="w-52 h-40 motion-safe:animate-pulse" />
        <h2 id={idJudul} className="mt-6 text-3xl font-extrabold tracking-tight text-[#0E1B2A]">
          {judul}
        </h2>
        <p id={idIsi} className="mt-2 text-sm text-[#56657A] leading-relaxed">
          {isi}
        </p>
      </div>
    </div>
  );
}
