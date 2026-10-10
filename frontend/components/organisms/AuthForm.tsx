"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PrimaryButton } from "../atoms/PrimaryButton";

type Mode = "masuk" | "daftar";

const inputCls =
  "w-full min-h-12 px-4 text-base bg-white border border-[#DCE3EC] rounded-4xl focus:outline-none focus:border-[#1E3A5F] placeholder:text-[#64748B]";

const DEMO = [
  { peran: "verifikator", judul: "Verifikator BPJS", isi: "Antrean, detail, dan audit rujukan" },
  { peran: "tkmkb", judul: "Anggota TKMKB", isi: "Audit medis kasus berisiko tinggi" },
  { peran: "dinkes", judul: "Dinas Kesehatan", isi: "Pantauan per wilayah, tanpa data pasien" },
  { peran: "dokter", judul: "Dokter FKTP", isi: "Menjawab permintaan klarifikasi" },
];

export const AuthForm = ({ mode, demo = false }: { mode: Mode; demo?: boolean }) => {
  const router = useRouter();
  const daftar = mode === "daftar";
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState("");
  const [proses, setProses] = useState(false);

  const masukDemo = async (peran: string) => {
    setGalat("");
    setProses(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peran }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setGalat(data.message ?? "Akun demo tidak tersedia.");
      router.push(data.tujuan ?? "/dashboard");
      router.refresh();
    } catch {
      setGalat("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setProses(false);
    }
  };

  const kirim = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const sandi = String(f.get("sandi") ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setGalat("Alamat email belum benar.");
    if (!sandi) return setGalat("Kata sandi wajib diisi.");
    setGalat("");
    setProses(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sandi }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGalat(data.message ?? "Gagal masuk. Coba lagi.");
        return;
      }
      router.push(data.tujuan ?? "/dashboard");
      router.refresh();
    } catch {
      setGalat("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setProses(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white text-[#0E1B2A]">
      <aside className="relative hidden lg:flex flex-col justify-between p-12 text-white bg-[#0E1B2A] overflow-hidden">
        <Image
          src="/images/rumah-sakit.jpg"
          alt="Gedung rumah sakit dengan kanopi pintu masuk"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#0E1B2A]/60" />
        <Link href="/" className="relative self-start">
          <Image
            src="/sirujuk_logoweb.png"
            alt="SIRUJUK Anti Fraud"
            width={1047}
            height={306}
            priority
            className="h-10 w-auto rounded-3xl bg-white px-2 py-1"
          />
        </Link>
        <div className="relative">
          <h2 className="text-5xl xl:text-6xl font-extrabold tracking-tighter leading-[1.05]">
            {daftar
              ? "Gabung dan mulai cek rujukan."
              : "Selamat datang kembali."}
          </h2>
          <p className="text-lg mt-4 max-w-md">
            Skor hanya penunjuk prioritas. Keputusan akhir tetap di tangan
            manusia.
          </p>
        </div>
        <p className="relative text-sm">
          Akses kamu dicatat sesuai UU Pelindungan Data Pribadi. Foto: National
          Cancer Institute di Unsplash.
        </p>
      </aside>

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
          <div className="mt-6 space-y-4">
            <p className="text-lg text-[#56657A]">
              Akun SIRUJUK tidak bisa dibuat sendiri, karena sistem ini memuat data kesehatan. Hubungi admin di instansi kamu
              (BPJS Kesehatan, TKMKB, Dinas Kesehatan, atau FKTP) untuk dibuatkan akun sesuai perannya.
            </p>
            <Link href="/login" className="inline-flex min-h-12 items-center px-7 rounded-4xl font-bold text-white bg-[#1E3A5F] hover:bg-[#16304F]">
              Sudah punya akun? Masuk
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={kirim} noValidate className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">Email</label>
                <input id="email" name="email" type="email" autoComplete="username" placeholder="nama@instansi.go.id" className={inputCls} />
              </div>
              <div>
                <label htmlFor="sandi" className="block text-sm font-bold text-[#0E1B2A] mb-1.5">Kata sandi</label>
                <div className="relative">
                  <input id="sandi" name="sandi" type={lihat ? "text" : "password"} autoComplete="current-password" className={`${inputCls} pr-14`} />
                  <button
                    type="button"
                    onClick={() => setLihat(!lihat)}
                    aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#56657A]"
                  >
                    {lihat ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                  </button>
                </div>
              </div>
              {galat && (
                <p role="alert" className="text-sm font-semibold text-[#C42222]">
                  {galat}
                </p>
              )}
              <PrimaryButton type="submit" disabled={proses} className="w-full py-3.5 text-base">
                {proses ? "Memeriksa…" : "Masuk"}
              </PrimaryButton>
            </form>
            {demo && (
              <section aria-labelledby="judul-demo" className="mt-8">
                <h2 id="judul-demo" className="text-xl font-extrabold tracking-tight">Coba tanpa akun</h2>
                <p className="text-sm text-[#56657A] mt-1">Pilih peran, langsung masuk. Datanya contoh dan tidak memuat pasien sungguhan.</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  {DEMO.map((d) => (
                    <button
                      key={d.peran}
                      type="button"
                      disabled={proses}
                      onClick={() => masukDemo(d.peran)}
                      className="text-left rounded-4xl border border-[#DCE3EC] bg-white p-4 min-h-20 hover:border-[#1E3A5F] transition-colors disabled:cursor-not-allowed"
                    >
                      <span className="block font-extrabold tracking-tight text-[#0E1B2A]">{d.judul}</span>
                      <span className="block text-xs text-[#56657A] mt-0.5">{d.isi}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <p className="text-sm text-[#56657A] mt-6">
              Belum punya akun?{" "}
              <Link href="/daftar" className="font-bold text-[#1E3A5F] underline underline-offset-2">Minta akses</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
};
