"use client";

import { useEffect, useId, useRef } from "react";
import { Illustration } from "../atoms/Illustration";
import type { IllustrationName } from "../atoms/Illustration";
import { PrimaryButton } from "../atoms/PrimaryButton";

interface StatusDialogProps {
  jenis: "proses" | "berhasil" | "gagal";
  art: IllustrationName;
  judul: string;
  isi: string;
  /** Diisi bila pop-up bisa ditutup (berhasil dan gagal). Pop-up proses tidak bisa ditutup. */
  onTutup?: () => void;
}

/** Pop-up di tengah layar: ilustrasi, judul besar, lalu penjelasan, semuanya di tengah. Menutup halaman di belakangnya. */
export function StatusDialog({ jenis, art, judul, isi, onTutup }: StatusDialogProps) {
  const idJudul = useId();
  const idIsi = useId();
  const ref = useRef<HTMLDivElement>(null);

  // Fokus pindah ke dialog (atau tombolnya) supaya halaman di belakang tidak bisa dioperasikan lewat keyboard.
  useEffect(() => (ref.current?.querySelector("button") ?? ref.current)?.focus(), []);
  useEffect(() => {
    if (!onTutup) return;
    const tekan = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [onTutup]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1B2A]/60">
      <div
        ref={ref}
        role={jenis === "gagal" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-busy={jenis === "proses"}
        aria-labelledby={idJudul}
        aria-describedby={idIsi}
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-4xl border border-[#DCE3EC] px-8 py-10 flex flex-col items-center text-center outline-none"
      >
        <Illustration name={art} className={`w-52 h-40 ${jenis === "proses" ? "motion-safe:animate-pulse" : ""}`} />
        <h2 id={idJudul} className="mt-6 text-3xl font-extrabold tracking-tight text-[#0E1B2A]">
          {judul}
        </h2>
        <p id={idIsi} className="mt-2 text-sm text-[#56657A] leading-relaxed">
          {isi}
        </p>
        {jenis === "gagal" && onTutup && (
          <PrimaryButton onClick={onTutup} className="mt-6 px-10 py-3">
            Tutup
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
