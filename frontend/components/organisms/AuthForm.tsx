"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuthForm } from "../../hooks/useAuthForm";
import { AuthHero } from "./auth/AuthHero";
import { DemoAccess } from "./auth/DemoAccess";
import { LoginForm } from "./auth/LoginForm";
import { SignupNotice } from "./auth/SignupNotice";

interface AuthFormProps {
  mode: "masuk" | "daftar";
  demo?: boolean;
}

export function AuthForm({ mode, demo = false }: AuthFormProps) {
  const daftar = mode === "daftar";
  const auth = useAuthForm();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white text-[#0E1B2A]">
      <AuthHero daftar={daftar} />
      <main className="flex flex-col justify-center px-5 sm:px-10 py-10 max-w-xl w-full mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-11 text-sm font-semibold text-[#56657A] hover:text-[#1E3A5F] self-start"
        >
          <ArrowLeft aria-hidden="true" size={16} /> Beranda
        </Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter leading-[1.05] mt-4">
          {daftar ? "Minta akses" : "Masuk"}
        </h1>
        {daftar ? (
          <SignupNotice />
        ) : (
          <>
            <LoginForm auth={auth} />
            {demo && (
              <DemoAccess disabled={auth.proses} onPilih={auth.masukDemo} />
            )}
            <p className="text-sm text-[#56657A] mt-6">
              Belum punya akun?{" "}
              <Link
                href="/daftar"
                className="font-bold text-[#1E3A5F] underline underline-offset-2"
              >
                Minta akses
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
