import Link from "next/link";
import { EmptyState } from "../components/atoms/EmptyState";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F4F6F9] px-5">
      <EmptyState title="Halaman tidak ditemukan" body="Alamat yang Anda buka tidak ada atau sudah dipindahkan." />
      <Link href="/" className="inline-flex items-center min-h-11 px-5 rounded-4xl bg-[#1E3A5F] font-semibold text-white">
        Ke beranda
      </Link>
    </main>
  );
}
