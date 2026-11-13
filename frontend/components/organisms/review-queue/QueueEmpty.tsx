import { Card } from "../../atoms/Card";
import { Illustration } from "../../atoms/Illustration";

export function QueueEmpty() {
  return (
    <Card className="py-12 flex flex-col items-center text-center">
      <div className="w-44 h-32">
        <Illustration name="antrean-kosong" className="w-full h-full" />
      </div>
      <div className="font-bold text-[#0E1B2A] mt-4">Tidak ada rujukan</div>
      <p className="text-sm text-[#56657A] mt-1 max-w-sm">Coba kategori lain atau pilih Semua.</p>
    </Card>
  );
}
