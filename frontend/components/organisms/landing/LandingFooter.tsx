import Image from "next/image";
import Link from "next/link";
import { HALAMAN } from "../../../data/footer-pages";
import { MENU } from "../../../data/landing-menu";
import { FooterColumn } from "./FooterColumn";

interface LandingFooterProps {
  onEnter: () => void;
  onDaftar: () => void;
}

export function LandingFooter({ onEnter, onDaftar }: LandingFooterProps) {
  return (
    <footer className="bg-[#0E1B2A] text-[#C9D6E6] rounded-t-4xl">
      <div className="max-w-[75rem] mx-auto px-5 md:px-10 py-14 grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr] text-sm">
        <div>
          <div className="flex items-center gap-5">
            <Image
              src="/sirujuk-logo-long.png"
              alt="SIRUJUK Anti Fraud"
              width={829}
              height={274}
              className="w-auto h-10"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <Image src="/logo-bpjs.png" alt="BPJS Kesehatan" width={320} height={320} className="w-auto h-10" />
          </div>
          <p className="mt-3 max-w-xs leading-relaxed">
            Sistem verifikasi rujukan berbasis data untuk Program JKN. Skor risiko hanya penunjuk prioritas, bukan bukti kecurangan.
          </p>
        </div>
        <FooterColumn title="Jelajahi" label="Jelajahi">
          {MENU.map(({ href, label }) => (
            <a key={href} href={href} className="block hover:text-white">{label}</a>
          ))}
        </FooterColumn>
        <FooterColumn title="Halaman" label="Halaman petugas">
          {HALAMAN.map(({ href, label }) => (
            <Link key={href} href={href} className="block hover:text-white">{label}</Link>
          ))}
        </FooterColumn>
        <FooterColumn title="Akun">
          <button type="button" onClick={onEnter} className="block min-h-8 text-left hover:text-white">Masuk</button>
          <button type="button" onClick={onDaftar} className="block min-h-8 text-left hover:text-white">Minta akses</button>
        </FooterColumn>
      </div>
      <p className="pb-8 text-center text-xs">© 2026 Sirujuk. Hak cipta dilindungi.</p>
    </footer>
  );
}
