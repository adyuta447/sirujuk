import Image from "next/image";

// Merk SIRUJUK: perisai logo-only + teks HTML (tajam di semua ukuran).
// Perisai berwarna navy di atas transparan, jadi di latar gelap ia tenggelam:
// varian "dark" menaruh perisai dalam lencana putih kecil (gaya ikon aplikasi),
// varian "light" menampilkan perisai mentah tanpa latar.
export const BrandMark = ({
  variant = "dark",
  shield = 40,
}: {
  variant?: "dark" | "light";
  shield?: number;
}) => {
  const gelap = variant === "dark";
  return (
    <span className="flex items-center gap-2.5" role="img" aria-label="SIRUJUK Anti Fraud">
      <span
        aria-hidden="true"
        className={`flex items-center justify-center shrink-0 rounded-2xl ${gelap ? "bg-white p-1.5" : ""}`}
      >
        <Image
          src="/sirujuk-logo-only.png"
          alt=""
          width={251}
          height={274}
          priority={false}
          style={{ height: shield, width: "auto" }}
        />
      </span>
      <span aria-hidden="true" className="flex flex-col leading-none">
        <span
          className="font-extrabold tracking-tight"
          style={{ fontSize: shield * 0.48, color: gelap ? "#FFFFFF" : "#0E1B2A" }}
        >
          SIRUJUK
        </span>
        <span
          className="font-semibold"
          style={{ fontSize: shield * 0.27, color: gelap ? "#C9D6E6" : "#56657A" }}
        >
          Anti Fraud
        </span>
      </span>
    </span>
  );
};
