import Image from "next/image";

// Merk SIRUJUK: perisai logo-only + teks HTML (tajam di semua ukuran).
// Perisai tampil mentah tanpa lencana latar, di permukaan gelap maupun terang.
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
      <Image
        src="/sirujuk-logo-only.png"
        alt=""
        aria-hidden="true"
        width={251}
        height={274}
        priority={false}
        className="shrink-0"
        style={{ height: shield, width: "auto" }}
      />
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
