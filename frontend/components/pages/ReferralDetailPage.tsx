import type { AppNavigation } from "../../hooks/useAppNavigation";
import type { RujukanCase } from "../../lib/sirujuk-data";
import { ReferralDetail } from "../organisms/ReferralDetail";

interface ReferralDetailPageProps {
  kasus: RujukanCase | null;
  memuat: boolean;
  nav: AppNavigation;
}

export function ReferralDetailPage({ kasus, memuat, nav }: ReferralDetailPageProps) {
  if (kasus) {
    return (
      <ReferralDetail
        kasus={kasus}
        onBack={nav.keAntrean}
        onAudit={nav.mulaiAudit}
        onDokter={nav.keDokter}
        onKlarifikasi={nav.keKlarifikasi}
      />
    );
  }
  if (memuat) return <p className="p-6 text-sm">Memuat rujukan…</p>;
  return <p role="alert" className="p-6 text-sm text-[#9B1C1C]">Rujukan tidak ditemukan. Kembali ke antrean.</p>;
}
