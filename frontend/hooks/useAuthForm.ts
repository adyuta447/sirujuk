"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { kirimAuth } from "../lib/auth-client";
import type { HasilAuth } from "../lib/auth-client";

export type AuthFormState = ReturnType<typeof useAuthForm>;

export function useAuthForm() {
  const router = useRouter();
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState(false);

  const jalankan = async (kirim: Promise<HasilAuth>) => {
    setGalat("");
    setProses(true);
    const hasil = await kirim;
    setProses(false);
    if ("galat" in hasil) return setGalat(hasil.galat);
    router.push(hasil.tujuan);
    router.refresh();
  };

  const masukDemo = (peran: string) =>
    jalankan(kirimAuth("/api/auth/demo", { peran }, "Akun demo tidak tersedia."));

  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const sandi = String(f.get("sandi") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setGalat("Alamat email belum benar.");
    if (!sandi) return setGalat("Kata sandi wajib diisi.");
    return jalankan(kirimAuth("/api/auth/login", { email, sandi }, "Gagal masuk. Coba lagi."));
  };

  return { galat, proses, masukDemo, kirim };
}
