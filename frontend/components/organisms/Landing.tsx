"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Check, Eye, Menu, OctagonAlert, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { Illustration } from "../atoms/Illustration";
import { CountUp } from "../atoms/CountUp";
import { Faq } from "./Faq";
import { LangkahScroll } from "./LangkahScroll";
import type { IllustrationName } from "../atoms/Illustration";
import { NAVY, RISK } from "../../lib/sirujuk-data";

const FITUR: { judul: string; isi: string; art: IllustrationName; bg: string; teks: string }[] = [
  { judul: "Urutannya jelas", isi: "Rujukan paling berisiko selalu ada di atas antrean. Tidak perlu menebak mulai dari mana.", art: "antrean-kosong", bg: NAVY, teks: "#FFFFFF" },
  { judul: "Ada alasannya", isi: "Tiap rujukan disertai penjelasan dan angka pembanding, bukan cuma skor.", art: "analitik", bg: RISK.rendah.solid, teks: "#FFFFFF" },
  { judul: "Kamu yang memutuskan", isi: "Skor hanya penunjuk prioritas. Keputusan akhir dan catatan alasannya ada di tangan verifikator.", art: "audit", bg: RISK.sedang.solid, teks: "#FFFFFF" },
];


const KATEGORI: { label: string; isi: string; tone: "rendah" | "sedang" | "tinggi"; Icon: typeof Check }[] = [
  { label: "Lolos", isi: "Lolos otomatis. Tidak perlu dicek manual.", tone: "rendah", Icon: Check },
  { label: "Perlu Ditinjau", isi: "Masuk antrean verifikator dengan prioritas menengah.", tone: "sedang", Icon: Eye },
  { label: "Risiko Tinggi", isi: "Klaim ditahan sementara sampai audit medis selesai.", tone: "tinggi", Icon: OctagonAlert },
];

const PENGGUNA: { judul: string; isi: string; href: string; art: IllustrationName }[] = [
  { judul: "Verifikator BPJS", isi: "Buka antrean yang sudah diurutkan dari skor tertinggi, periksa, lalu catat keputusan dan alasannya.", href: "/queue", art: "pintasan-analitik" },
  { judul: "TKMKB", isi: "Bedah kasus merah satu per satu: bukti pendukung, penjelasan dokter, dan riwayat keputusannya.", href: "/audit", art: "audit" },
  { judul: "Dinas Kesehatan", isi: "Pantau agregat per wilayah, dari porsi risiko tinggi sampai konsentrasi RS tujuan. Tanpa identitas pasien.", href: "/dinkes", art: "pintasan-wilayah" },
  { judul: "Dokter FKTP", isi: "Terima permintaan klarifikasi atas rujukanmu dan kirim penjelasan sebelum 7 hari kerja.", href: "/klarifikasi", art: "pintasan-klarifikasi" },
];

const STAT: { v: number; suffix: string; l: string; Icon: typeof Users }[] = [
  { v: 284, suffix: " juta", l: "peserta JKN yang dilayani", Icon: Users },
  { v: 23758, suffix: "", l: "fasilitas kesehatan tingkat pertama", Icon: Building2 },
  { v: 4, suffix: "", l: "indikator di balik setiap skor", Icon: ShieldCheck },
  { v: 0, suffix: "", l: "keputusan yang diambil otomatis", Icon: UserCheck },
];

const MENU = [
  ["#fitur", "Kenapa SIRUJUK"],
  ["#cara-kerja", "Cara kerja"],
  ["#pengguna", "Untuk siapa"],
  ["#tanya-jawab", "Tanya jawab"],
];

export const Landing = ({ onEnter, onDaftar }: { onEnter: () => void; onDaftar: () => void }) => {
  const [menu, setMenu] = useState(false);
  const [statMulai, setStatMulai] = useState(false);
  const statRef = useRef<HTMLElement>(null);
  const [atas, setAtas] = useState(true);

  useEffect(() => {
    const onScroll = () => setAtas(window.scrollY < 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Latar halaman gelap selama di landing, supaya area di bawah footer (overscroll) tidak terlihat putih.
  useEffect(() => {
    const el = document.documentElement;
    const lama = el.style.backgroundColor;
    el.style.backgroundColor = "#0E1B2A";
    return () => {
      el.style.backgroundColor = lama;
    };
  }, []);

  // Counter statistik mulai sekali saat seksi masuk viewport.
  useEffect(() => {
    const el = statRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStatMulai(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!menu) return;
    const tutup = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tutup);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", tutup);
    };
  }, [menu]);
  return (
  <div className="min-h-screen bg-white text-[#0E1B2A]">
    <header className={`fixed top-0 inset-x-0 z-30 transition-colors duration-300 ${atas ? "bg-transparent" : "bg-white border-b border-[#DCE3EC]"}`}>
      <div className="max-w-[75rem] mx-auto flex items-center justify-between gap-4 px-5 md:px-10 h-[4.5rem]">
        <Image
          src="/sirujuk-logo-long.png"
          alt="SIRUJUK Anti Fraud"
          width={829}
          height={274}
          priority
          className="w-auto h-11 transition-[filter] duration-300"
          style={atas ? { filter: "brightness(0) invert(1)" } : undefined}
        />
        <nav aria-label="Navigasi halaman" className={`hidden md:flex items-center gap-8 text-sm font-bold transition-colors duration-300 ${atas ? "text-white [text-shadow:0_1px_10px_#0E1B2A]" : "text-[#56657A]"}`}>
          {MENU.map(([href, label]) => (
            <a key={href} href={href} className={atas ? "hover:underline underline-offset-4" : "hover:text-[#0E1B2A]"}>{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDaftar}
            className={`hidden sm:inline-flex min-h-11 items-center px-4 rounded-4xl text-sm font-bold transition-colors duration-300 ${atas ? "text-white [text-shadow:0_1px_10px_#0E1B2A]" : "text-[#1E3A5F]"}`}
          >
            Daftar
          </button>
          <button
            type="button"
            onClick={onEnter}
            className="min-h-11 px-6 rounded-4xl text-sm font-bold text-white bg-[#1E3A5F] hover:bg-[#16304F] transition-colors"
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="menu-mobile"
            aria-label={menu ? "Tutup menu" : "Buka menu"}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-4xl bg-[#E7ECF3] text-[#1E3A5F]"
          >
            {menu ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>
    </header>

    {menu && (
      <div
        id="menu-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="md:hidden fixed inset-0 z-50 flex flex-col text-white px-5 pt-5 pb-8"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-tight">SIRUJUK</span>
          <button
            type="button"
            onClick={() => setMenu(false)}
            aria-label="Tutup menu"
            className="w-12 h-12 flex items-center justify-center rounded-4xl bg-[#2C4E78]"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        <nav aria-label="Menu" className="flex-1 flex flex-col justify-center">
          {MENU.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenu(false)}
              className="min-h-20 flex items-center justify-between text-4xl font-extrabold tracking-tighter border-b border-[#3A5880] last:border-b-0"
            >
              {label}
              <ArrowRight aria-hidden="true" size={26} />
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={onEnter}
          className="min-h-14 rounded-4xl text-lg font-bold bg-white text-[#1E3A5F]"
        >
          Masuk ke SIRUJUK
        </button>
      </div>
    )}

    <main>
      <section className="relative flex flex-col bg-[#1E3A5F] text-white lg:min-h-screen">
        <div className="relative z-10 w-full max-w-[75rem] mx-auto px-5 md:px-10 pt-28 pb-10 lg:pt-36 order-1">
          <p className="text-sm font-bold tracking-widest uppercase lg:[text-shadow:0_1px_10px_#0E1B2A]">SIRUJUK</p>
          <h1 className="mt-3 max-w-3xl text-5xl md:text-7xl xl:text-8xl font-extrabold tracking-tighter leading-[1.02] lg:[text-shadow:0_2px_24px_#0E1B2A,0_0_3px_#0E1B2A]">
            Menjaga Rujukan Tetap Tepat
          </h1>
          <p className="mt-5 max-w-xl text-lg md:text-xl font-semibold lg:[text-shadow:0_2px_16px_#0E1B2A,0_0_3px_#0E1B2A]">
            Menandai rujukan JKN yang perlu dicek lebih dulu, lengkap dengan alasannya.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              type="button"
              onClick={onEnter}
              className="min-h-12 inline-flex items-center gap-2 px-7 rounded-4xl font-bold bg-white text-[#1E3A5F] hover:bg-[#E7ECF3] transition-colors"
            >
              Mulai cek <ArrowRight aria-hidden="true" size={18} />
            </button>
            <a
              href="#cara-kerja"
              className="min-h-12 inline-flex items-center px-7 rounded-4xl font-bold bg-[#1E3A5F] text-white border-2 border-white hover:bg-[#16304F] transition-colors"
            >
              Lihat cara kerja
            </a>
          </div>
        </div>
        <div className="relative h-72 order-2 lg:order-none lg:absolute lg:inset-0 lg:h-auto">
          <Image
            src="/images/hero-dokter.jpg"
            alt="Dokter tersenyum di meja kerja dengan laptop di klinik"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[60%_20%]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[#0E1B2A]/60" />
        </div>
      </section>

      <section ref={statRef} aria-label="SIRUJUK dalam angka" className="relative z-10 max-w-[75rem] mx-auto px-5 md:px-10 lg:-mt-16">
        <h2 className="sr-only">SIRUJUK dalam angka</h2>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 lg:pt-0">
          {STAT.map(({ v, suffix, l, Icon }, i) => (
            <div key={l} className="bg-white rounded-4xl border border-[#DCE3EC] p-5 md:p-6">
              <Icon aria-hidden="true" size={28} className="text-[#1E3A5F]" />
              <dt className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#0E1B2A] mt-4 tabular-nums">
                <CountUp target={v} suffix={suffix} mulai={statMulai} delay={i * 150} />
              </dt>
              <dd className="text-sm text-[#56657A] mt-1">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="fitur" className="max-w-[75rem] mx-auto px-5 md:px-10 py-20 scroll-mt-20">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] max-w-3xl">
          Kerja verifikasi jadi lebih terarah.
        </h2>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {FITUR.map((f) => (
            <article key={f.judul} className="rounded-4xl p-7 flex flex-col" style={{ backgroundColor: f.bg, color: f.teks }}>
              <h3 className="text-2xl font-extrabold tracking-tight">{f.judul}</h3>
              <p className="mt-2 flex-1">{f.isi}</p>
              <div className="bg-white rounded-4xl mt-7 p-4">
                <Illustration name={f.art} className="w-full h-40" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <LangkahScroll />

      <section id="pengguna" className="max-w-[75rem] mx-auto px-5 md:px-10 py-20 scroll-mt-20">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] max-w-3xl">
          Satu sistem, empat peran.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {PENGGUNA.map((p) => (
            <article
              key={p.judul}
              className="bg-white rounded-4xl border border-[#DCE3EC] p-5 flex flex-col"
            >
              <Illustration name={p.art} className="w-full h-36" />
              <h3 className="text-xl font-extrabold tracking-tight mt-4">{p.judul}</h3>
              <p className="text-sm text-[#56657A] mt-1 flex-1">{p.isi}</p>
            </article>
          ))}
        </div>

        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-16">Hasilnya ada tiga.</h3>
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          {KATEGORI.map(({ label, isi, tone, Icon }) => (
            <div key={label} className="bg-white rounded-4xl border border-[#DCE3EC] p-6">
              <span
                aria-hidden="true"
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: RISK[tone].soft, color: RISK[tone].solid }}
              >
                <Icon size={24} />
              </span>
              <div className="text-2xl font-extrabold tracking-tight mt-4" style={{ color: RISK[tone].solid }}>
                {label}
              </div>
              <p className="text-sm text-[#56657A] mt-1">{isi}</p>
            </div>
          ))}
        </div>
      </section>

      <Faq />

      <section className="max-w-[75rem] mx-auto px-5 md:px-10 py-20">
        <div className="rounded-4xl p-8 md:p-14 grid md:grid-cols-[1fr_auto] gap-8 items-center text-white" style={{ backgroundColor: NAVY }}>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05]">Siap mulai mengecek?</h2>
          <button
            type="button"
            onClick={onEnter}
            className="min-h-12 inline-flex items-center justify-center gap-2 px-8 rounded-4xl font-bold bg-white text-[#1E3A5F] hover:bg-[#E7ECF3] transition-colors"
          >
            Masuk ke SIRUJUK <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </section>
    </main>

    <footer className="bg-[#0E1B2A] text-[#C9D6E6] rounded-t-4xl">
      <div className="max-w-[75rem] mx-auto px-5 md:px-10 py-14 grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] text-sm">
        <div>
          <Image
            src="/sirujuk-logo-long.png"
            alt="SIRUJUK Anti Fraud"
            width={829}
            height={274}
            className="w-auto h-10"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <p className="mt-3 max-w-xs leading-relaxed">
            Sistem verifikasi rujukan berbasis data untuk Program JKN. Skor risiko hanya penunjuk prioritas, bukan bukti kecurangan.
          </p>
        </div>
        <nav aria-label="Jelajahi" className="space-y-2.5">
          <div className="font-bold text-white mb-3">Jelajahi</div>
          <a href="#fitur" className="block hover:text-white">Kenapa Sirujuk</a>
          <a href="#cara-kerja" className="block hover:text-white">Cara kerja</a>
          <a href="#pengguna" className="block hover:text-white">Untuk siapa</a>
          <a href="#tanya-jawab" className="block hover:text-white">Tanya jawab</a>
        </nav>
        <nav aria-label="Halaman petugas" className="space-y-2.5">
          <div className="font-bold text-white mb-3">Halaman</div>
          <Link href="/dashboard" className="block hover:text-white">Beranda</Link>
          <Link href="/queue" className="block hover:text-white">Antrean Cek</Link>
          <Link href="/klarifikasi" className="block hover:text-white">Klarifikasi</Link>
          <Link href="/dinkes" className="block hover:text-white">Pantauan Wilayah</Link>
        </nav>
        <div className="space-y-2.5">
          <div className="font-bold text-white mb-3">Akun</div>
          <button type="button" onClick={onEnter} className="block min-h-8 text-left hover:text-white">Masuk</button>
          <button type="button" onClick={onDaftar} className="block min-h-8 text-left hover:text-white">Minta akses</button>
        </div>
      </div>

      <p className="pb-8 text-center text-xs">© 2026 Sirujuk. Hak cipta dilindungi.</p>
    </footer>
  </div>
  );
};