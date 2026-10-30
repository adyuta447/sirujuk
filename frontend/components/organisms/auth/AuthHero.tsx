import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "../../atoms/BrandMark";

interface AuthHeroProps {
  daftar: boolean;
}

export function AuthHero({ daftar }: AuthHeroProps) {
  return (
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
        <BrandMark variant="dark" shield={76} />
      </Link>
      <div className="relative">
        <h2 className="text-5xl xl:text-6xl font-extrabold tracking-tighter leading-[1.05]">
          {daftar ? "Gabung dan mulai cek rujukan." : "Selamat datang kembali."}
        </h2>
        <p className="text-lg mt-4 max-w-md">Skor hanya penunjuk prioritas. Keputusan akhir tetap di tangan manusia.</p>
      </div>
      <p className="relative text-sm">
        Akses kamu dicatat sesuai UU Pelindungan Data Pribadi. Foto: National Cancer Institute di Unsplash.
      </p>
    </aside>
  );
}
