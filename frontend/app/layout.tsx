import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import "./tailwind.css";
import { QueryProvider } from "../providers/QueryProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sirujuk",
  description: "Membantu verifikator menentukan rujukan JKN mana yang perlu dicek lebih dulu, lengkap dengan alasannya.",
};

// Nonce CSP needs per-request rendering, so every page is dynamic.
export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="id" className={jakarta.variable}>
      <body><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
