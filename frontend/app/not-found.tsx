import Link from "next/link";
import { EmptyState } from "../components/atoms/EmptyState";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F4F6F9] px-5">
      <div className="w-full max-w-md">
        <EmptyState art="tidak-ditemukan" title="Halaman tidak ditemukan" body="Alamat yang Anda buka tidak ada atau sudah dipindahkan.">
          <Link href="/" className="inline-flex items-center min-h-11 px-5 rounded-4xl bg-[#1E3A5F] font-semibold text-white">
            Ke beranda
          </Link>
        </EmptyState>
      </div>
    </main>
  );
}
