import type { Ringkasan } from "../../../lib/ringkasan";
import { Card } from "../../atoms/Card";
import { DestinationBar } from "./DestinationBar";

interface TopDestinationsProps {
  tujuan: Ringkasan["tujuanTerbanyak"];
}

export function TopDestinations({ tujuan }: TopDestinationsProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE3EC]">
        <div className="font-bold text-[#0E1B2A]">Rumah sakit tujuan terbanyak</div>
        <div className="text-xs text-[#56657A] mt-0.5">Rujukan yang menumpuk di satu rumah sakit perlu diperiksa.</div>
      </div>
      <div className="p-5 space-y-3.5">
        {tujuan.map((f) => (
          <DestinationBar key={f.nama} tujuan={f} />
        ))}
      </div>
    </Card>
  );
}
