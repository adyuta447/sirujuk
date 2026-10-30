import Image from "next/image";
import { Card } from "../../atoms/Card";

export function SisruteNote() {
  return (
    <Card className="mt-5 p-6 md:p-8 flex flex-col sm:flex-row items-start gap-6">
      <Image src="/logo-sisrute-removebg-preview.png" alt="Logo SISRUTE" width={920} height={980} className="w-24 h-auto shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Sumber data</p>
        <h3 className="text-2xl font-extrabold tracking-tight mt-1">Memakai data SISRUTE Kemenkes</h3>
        <p className="mt-2 text-[#56657A] leading-relaxed">
          Salah satu dari empat indikator skor memeriksa ketersediaan alat dan SDM di faskes asal menurut SISRUTE.
          Bila rujukan beralasan alat tidak tersedia padahal datanya menunjukkan tersedia, skor menandainya.
          Data yang sudah lama otomatis berbobot rendah.
        </p>
      </div>
    </Card>
  );
}
