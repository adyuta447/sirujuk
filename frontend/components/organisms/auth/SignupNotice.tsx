import Link from "next/link";

export function SignupNotice() {
  return (
    <div className="mt-6 space-y-4">
      <p className="text-lg text-[#56657A]">
        Akun SIRUJUK tidak bisa dibuat sendiri, karena sistem ini memuat data kesehatan. Hubungi admin di instansi kamu
        (BPJS Kesehatan, TKMKB, Dinas Kesehatan, atau FKTP) untuk dibuatkan akun sesuai perannya.
      </p>
      <Link
        href="/login"
        className="inline-flex min-h-12 items-center px-7 rounded-4xl font-bold text-white bg-[#1E3A5F] hover:bg-[#16304F]"
      >
        Sudah punya akun? Masuk
      </Link>
    </div>
  );
}
