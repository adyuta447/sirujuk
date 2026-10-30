import { Card } from "../../atoms/Card";
import { Illustration } from "../../atoms/Illustration";

export function ReferralListEmpty() {
  return (
    <Card role="status" className="py-10 flex flex-col items-center text-center px-4">
      <Illustration name="tidak-ditemukan" className="w-44 h-32" />
      <p className="font-bold text-[#0E1B2A] mt-3">Tidak ada rujukan yang cocok</p>
      <p className="text-sm text-[#56657A] mt-1">Ubah kata kunci atau wilayah.</p>
    </Card>
  );
}
