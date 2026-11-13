import { MENU } from "../../../data/landing-menu";

interface LandingNavProps {
  atas: boolean;
}

export function LandingNav({ atas }: LandingNavProps) {
  const warna = atas ? "text-white [text-shadow:0_1px_10px_#0E1B2A]" : "text-[#56657A]";
  return (
    <nav
      aria-label="Navigasi halaman"
      className={`hidden md:flex items-center gap-8 text-sm font-bold transition-colors duration-300 ${warna}`}
    >
      {MENU.map(({ href, label }) => (
        <a key={href} href={href} className={atas ? "hover:underline underline-offset-4" : "hover:text-[#0E1B2A]"}>
          {label}
        </a>
      ))}
    </nav>
  );
}
