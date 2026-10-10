"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Check, Eye, Menu, Pause, Plus, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { Illustration } from "../atoms/Illustration";
import { LangkahScroll } from "./LangkahScroll";
import type { IllustrationName } from "../atoms/Illustration";
import { NAVY, RISK } from "../../lib/sirujuk-data";

const FITUR: { judul: string; isi: string; art: IllustrationName; bg: string; teks: string }[] = [
  { judul: "Urutannya jelas", isi: "Rujukan paling berisiko selalu ada di atas antrean. Tidak perlu menebak mulai dari mana.", art: "antrean-kosong", bg: NAVY, teks: "#FFFFFF" },
  { judul: "Ada alasannya", isi: "Tiap rujukan disertai penjelasan dan angka pembanding, bukan cuma skor.", art: "analitik", bg: RISK.rendah.solid, teks: "#FFFFFF" },
  { judul: "Kamu yang memutuskan", isi: "Skor hanya penunjuk prioritas. Keputusan akhir dan catatan alasannya ada di tangan verifikator.", art: "audit", bg: RISK.sedang.solid, teks: "#FFFFFF" },
];


const KATEGORI = [
  { label: RISK.rendah.label, isi: "Lolos otomatis. Tidak perlu dicek manual.", warna: RISK.rendah.solid, Icon: Check },
  { label: RISK.sedang.label, isi: "Masuk antrean verifikator dengan prioritas menengah.", warna: RISK.sedang.solid, Icon: Eye },
  { label: RISK.tinggi.label, isi: "Klaim ditahan sementara sampai audit medis selesai.", warna: RISK.tinggi.solid, Icon: Pause },
];

const PENGGUNA: { judul: string; isi: string; href: string; art: IllustrationName }[] = [
  { judul: "Verifikator BPJS", isi: "Kerjakan antrean rujukan dari yang paling berisiko.", href: "/queue", art: "pintasan-analitik" },
  { judul: "TKMKB", isi: "Periksa kasus merah beserta bukti dan catatan keputusan.", href: "/audit", art: "audit" },
  { judul: "Dinas Kesehatan", isi: "Pantau pola rujukan tiap wilayah tanpa data pasien.", href: "/dinkes", art: "pintasan-wilayah" },
  { judul: "Dokter FKTP", isi: "Terima permintaan klarifikasi dan jawab langsung.", href: "/klarifikasi", art: "pintasan-klarifikasi" },
];

const TANYA = [
  ["Apakah skor tinggi berarti dokter berbuat curang?", "Tidak. Skor hanya penunjuk prioritas untuk diperiksa. Dokter lebih dulu diminta klarifikasi, dan keputusan akhir ada pada manusia."],
  ["Siapa yang memutuskan rujukan ditahan?", "Verifikator dan TKMKB. Sistem tidak pernah menahan klaim atau menjatuhkan sanksi sendiri."],
  ["Bagaimana dengan daerah yang rumah sakitnya terbatas?", "Pola seperti itu bisa punya alasan sah. Ambang skor disesuaikan per wilayah, dan dokter bisa menjelaskannya lewat klarifikasi."],
  ["Apakah data pasien terlihat?", "Pasien ditampilkan sebagai pseudonim. Dinas Kesehatan hanya melihat angka per wilayah."],
  ["Apa yang belum bisa dideteksi?", "Pasien yang memalsukan keluhan dan kolusi dokter dengan pasien. Itu masuk pengembangan berikutnya."],
];

const STAT = [
  { v: "284 juta", l: "peserta JKN yang dilayani", Icon: Users },
  { v: "23.758", l: "fasilitas kesehatan tingkat pertama", Icon: Building2 },
  { v: "4", l: "indikator di balik setiap skor", Icon: ShieldCheck },
  { v: "0", l: "keputusan yang diambil otomatis", Icon: UserCheck },
];

const MENU = [
  ["#fitur", "Kenapa SIRUJUK"],
  ["#cara-kerja", "Cara kerja"],
  ["#pengguna", "Untuk siapa"],
  ["#tanya-jawab", "Tanya jawab"],
];

export const Landing = ({ onEnter, onDaftar }: { onEnter: () => void; onDaftar: () => void }) => {
  const [menu, setMenu] = useState(false);
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

  // Menu layar penuh (HP): kunci scroll halaman dan tutup dengan Escape.
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
    <header className={`fixed top-0 inset-x-0 z-30 transition-colors ${atas ? "bg-transparent" : "bg-white border-b border-[#DCE3EC]"}`}>
      <div className="max-w-[75rem] mx-auto flex items-center justify-between gap-4 px-5 md:px-10 h-[4.5rem]">
        <Image src="/sirujuk_logoweb.png" alt="SIRUJUK Anti Fraud" width={1047} height={306} priority className="h-9 w-auto rounded-3xl bg-white px-2 py-1" />
        <nav aria-label="Navigasi halaman" className={`hidden md:flex items-center gap-8 text-sm font-bold ${atas ? "text-white [text-shadow:0_1px_10px_#0E1B2A]" : "text-[#56657A]"}`}>
          {MENU.map(([href, label]) => (
            <a key={href} href={href} className={atas ? "hover:underline underline-offset-4" : "hover:text-[#0E1B2A]"}>{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDaftar}
            className={`hidden sm:inline-flex min-h-11 items-center px-4 rounded-4xl text-sm font-bold ${atas ? "text-white [text-shadow:0_1px_10px_#0E1B2A]" : "text-[#1E3A5F]"}`}
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

      <section aria-label="SIRUJUK dalam angka" className="relative z-10 max-w-[75rem] mx-auto px-5 md:px-10 lg:-mt-16">
        <h2 className="sr-only">SIRUJUK dalam angka</h2>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 lg:pt-0">
          {STAT.map(({ v, l, Icon }) => (
            <div key={l} className="bg-white rounded-4xl border border-[#DCE3EC] p-5 md:p-6">
              <Icon aria-hidden="true" size={28} className="text-[#1E3A5F]" />
              <dt className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#0E1B2A] mt-4">{v}</dt>
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

      <section className="bg-[#F4F6F9]">
        <div className="max-w-[75rem] mx-auto px-5 md:px-10 py-20">
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight ">Hasilnya ada tiga.</h3>
          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {KATEGORI.map(({ label, isi, warna, Icon }) => (
              <div key={label} className="rounded-4xl p-6 text-white" style={{ backgroundColor: warna }}>
                <Icon aria-hidden="true" size={28} />
                <div className="text-2xl font-extrabold tracking-tight mt-3">{label}</div>
                <p className="mt-1">{isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pengguna" className="max-w-[75rem] mx-auto px-5 md:px-10 py-20 scroll-mt-20">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] max-w-3xl">
          Satu sistem, empat peran.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {PENGGUNA.map((p) => (
            <Link
              key={p.judul}
              href={p.href}
              className="group bg-white rounded-4xl border border-[#DCE3EC] p-5 hover:border-[#1E3A5F] transition-colors flex flex-col"
            >
              <Illustration name={p.art} className="w-full h-36" />
              <h3 className="text-xl font-extrabold tracking-tight mt-4">{p.judul}</h3>
              <p className="text-sm text-[#56657A] mt-1 flex-1">{p.isi}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E3A5F] mt-4">
                Buka <ArrowRight aria-hidden="true" size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="tanya-jawab" className="bg-[#F4F6F9] scroll-mt-20">
        <div className="max-w-[56rem] mx-auto px-5 md:px-10 py-20">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05]">Tanya jawab.</h2>
          <div className="mt-10 space-y-3">
            {TANYA.map(([q, a]) => (
              <details key={q} className="group bg-white rounded-4xl border border-[#DCE3EC] px-6 py-2">
                <summary className="min-h-14 flex items-center justify-between gap-4 cursor-pointer list-none font-bold text-lg [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus aria-hidden="true" size={20} className="shrink-0 transition-transform group-open:rotate-45" />
                </summary>
                <p className="text-[#56657A] pb-4">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

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
          <div className="text-3xl font-extrabold tracking-tighter text-white">
            Sirujuk<span className="text-[#7DB4F5]">.</span>
          </div>
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